import { Request, Response } from 'express'
import Stripe from 'stripe'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription
    await prisma.subscription.upsert({
      where: { stripeCustomerId: sub.customer as string },
      create: {
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0].price.id,
        status: sub.status.toUpperCase() as any,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        organization: { connect: { id: sub.metadata.orgId } },
      },
      update: {
        status: sub.status.toUpperCase() as any,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      },
    })
  }

  res.json({ received: true })
}
