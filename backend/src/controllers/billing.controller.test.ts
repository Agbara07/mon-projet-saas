import request from 'supertest'
import express from 'express'
import billingRoutes from '../routes/billing.routes'
import prisma from '../config/prisma'
import jwt from 'jsonwebtoken'

jest.mock('../config/prisma', () => ({
  organization: { findUnique: jest.fn() },
  subscription: {
    findUnique: jest.fn(),
    upsert:     jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_123' }) },
    checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
    billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://portal.stripe.com/test' }) } },
    webhooks: { constructEvent: jest.fn() },
  }))
})

const TOKEN = jwt.sign({ userId: 'u1', orgId: 'org1', role: 'OWNER' }, 'test_secret')
process.env.JWT_SECRET              = 'test_secret'
process.env.STRIPE_SECRET_KEY       = 'sk_test_xxx'
process.env.FRONTEND_URL            = 'http://localhost:3000'
process.env.STRIPE_PRICE_STARTER    = 'price_starter'
process.env.STRIPE_PRICE_PRO        = 'price_pro'
process.env.STRIPE_PRICE_ADVISOR    = 'price_advisor'

const app = express()
app.use(express.json())
app.use('/billing', billingRoutes)

beforeEach(() => jest.clearAllMocks())

/* ── GET /billing/info ───────────────────────────────────────── */
describe('GET /billing/info', () => {
  it('retourne les infos d\'abonnement pour un utilisateur FREE en trial', async () => {
    const futureDate = new Date(Date.now() + 7 * 86_400_000)
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ plan: 'FREE', trialEndsAt: futureDate })
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .get('/billing/info')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.plan).toBe('FREE')
    expect(res.body.effectivePlan).toBe('PRO')
    expect(res.body.trialActive).toBe(true)
    expect(res.body.trialDaysLeft).toBeGreaterThan(0)
    expect(res.body.subscription).toBeNull()
    expect(res.body.stripePriceIds.STARTER).toBe('price_starter')
  })

  it('retourne les infos pour un utilisateur STARTER sans trial', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue({ plan: 'STARTER', trialEndsAt: null })
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      status: 'ACTIVE', currentPeriodEnd: new Date(), canceledAt: null, stripePriceId: 'price_starter',
    })

    const res = await request(app)
      .get('/billing/info')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.plan).toBe('STARTER')
    expect(res.body.effectivePlan).toBe('STARTER')
    expect(res.body.trialActive).toBe(false)
    expect(res.body.subscription.status).toBe('ACTIVE')
  })

  it('renvoie 404 si l\'organisation est introuvable', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .get('/billing/info')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(404)
  })

  it('renvoie 500 si la DB plante', async () => {
    ;(prisma.organization.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .get('/billing/info')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(500)
  })
})

/* ── POST /billing/checkout ──────────────────────────────────── */
describe('POST /billing/checkout', () => {
  it('retourne une URL Stripe checkout (nouveau customer)', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ priceId: 'price_pro' })

    expect(res.status).toBe(200)
    expect(res.body.url).toContain('stripe.com')
  })

  it('réutilise le customerId existant — ne crée pas de nouvelle subscription (pas d\'upsert)', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ stripeCustomerId: 'cus_existing' })

    const res = await request(app)
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ priceId: 'price_starter' })

    expect(res.status).toBe(200)
    // Si le customer existe déjà, l'upsert ne doit pas être appelé
    expect(prisma.subscription.upsert).not.toHaveBeenCalled()
  })

  it('renvoie 500 si la DB plante pendant le checkout', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ priceId: 'price_pro' })

    expect(res.status).toBe(500)
  })
})

/* ── POST /billing/portal ────────────────────────────────────── */
describe('POST /billing/portal', () => {
  it('retourne une URL portail Stripe', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({ stripeCustomerId: 'cus_123' })

    const res = await request(app)
      .post('/billing/portal')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.url).toContain('stripe.com')
  })

  it('renvoie 400 si aucun abonnement', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .post('/billing/portal')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(400)
  })

  it('renvoie 500 si la DB plante pendant le portal', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/billing/portal')
      .set('Authorization', `Bearer ${TOKEN}`)

    expect(res.status).toBe(500)
  })
})
