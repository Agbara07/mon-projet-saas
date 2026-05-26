import { Request, Response } from 'express'
import Stripe from 'stripe'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'
import { getEffectivePlan, PLAN_LIMITS } from '../config/plan-limits'
import { Plan } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Mapping Stripe Price ID → Plan enum (configurer les vraies IDs dans .env)
const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_STARTER  ?? '']: 'STARTER',
  [process.env.STRIPE_PRICE_PRO      ?? '']: 'PRO',
  [process.env.STRIPE_PRICE_ADVISOR  ?? '']: 'ADVISOR',
}

export const getSubscriptionInfo = async (req: AuthRequest, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user!.orgId },
    select: { plan: true, trialEndsAt: true },
  })
  if (!org) return res.status(404).json({ message: 'Organisation introuvable' })

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: req.user!.orgId },
    select: { status: true, currentPeriodEnd: true, canceledAt: true, stripePriceId: true },
  })

  const now = new Date()
  const trialActive  = !!org.trialEndsAt && now < org.trialEndsAt
  const trialDaysLeft = org.trialEndsAt
    ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86_400_000))
    : 0

  const effectivePlan = getEffectivePlan(org.plan, org.trialEndsAt)
  const limits        = PLAN_LIMITS[effectivePlan]

  res.json({
    plan:          org.plan,
    effectivePlan,
    trialActive,
    trialDaysLeft,
    trialEndsAt:   org.trialEndsAt,
    limits,
    subscription:  sub ?? null,
    stripePriceIds: {
      STARTER: process.env.STRIPE_PRICE_STARTER ?? null,
      PRO:     process.env.STRIPE_PRICE_PRO     ?? null,
      ADVISOR: process.env.STRIPE_PRICE_ADVISOR ?? null,
    },
  })
}

export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  const { priceId } = req.body
  const orgId = req.user!.orgId

  let subscription = await prisma.subscription.findUnique({ where: { organizationId: orgId } })
  let customerId = subscription?.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { orgId } })
    customerId = customer.id
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { orgId } },
    success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/billing`,
  })

  res.json({ url: session.url })
}

export const createPortalSession = async (req: AuthRequest, res: Response) => {
  const sub = await prisma.subscription.findUnique({ where: { organizationId: req.user!.orgId } })
  if (!sub?.stripeCustomerId) return res.status(400).json({ message: 'Aucun abonnement trouvé' })

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/billing`,
  })

  res.json({ url: session.url })
}

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return res.status(400).send('Webhook Error')
  }

  try {
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub     = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0].price.id
      const newPlan = PRICE_TO_PLAN[priceId] ?? 'FREE'
      const isActive = sub.status === 'active' || sub.status === 'trialing'

      // orgId dans les métadonnées de la subscription (nouvelles) ou du customer (legacy)
      let orgId: string | undefined = sub.metadata?.orgId
      if (!orgId) {
        const customer = await stripe.customers.retrieve(sub.customer as string)
        if (!customer.deleted) orgId = (customer as Stripe.Customer).metadata?.orgId
      }

      const existingSub = await prisma.subscription.findUnique({
        where:  { stripeCustomerId: sub.customer as string },
        select: { organizationId: true },
      })

      if (!existingSub && !orgId) {
        return res.status(400).json({ message: 'orgId introuvable' })
      }

      const record = await prisma.subscription.upsert({
        where:  { stripeCustomerId: sub.customer as string },
        create: {
          stripeCustomerId:     sub.customer as string,
          stripeSubscriptionId: sub.id,
          stripePriceId:        priceId,
          status:               sub.status.toUpperCase() as any,
          currentPeriodEnd:     new Date(sub.current_period_end * 1000),
          organization:         { connect: { id: orgId! } },
        },
        update: {
          stripeSubscriptionId: sub.id,
          stripePriceId:        priceId,
          status:               sub.status.toUpperCase() as any,
          currentPeriodEnd:     new Date(sub.current_period_end * 1000),
          canceledAt:           null,
        },
        select: { organizationId: true },
      })

      await prisma.organization.update({
        where: { id: record.organizationId },
        data:  { plan: isActive ? newPlan : 'FREE' },
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data:  { status: 'CANCELED', canceledAt: new Date() },
      })
      const record = await prisma.subscription.findFirst({
        where:  { stripeSubscriptionId: sub.id },
        select: { organizationId: true },
      })
      if (record) {
        await prisma.organization.update({
          where: { id: record.organizationId },
          data:  { plan: 'FREE' },
        })
      }
    }
  } catch (err: any) {
    console.error('[webhook] erreur handler:', err?.message ?? err)
    return res.status(500).json({ message: 'Erreur webhook interne' })
  }

  res.json({ received: true })
}
