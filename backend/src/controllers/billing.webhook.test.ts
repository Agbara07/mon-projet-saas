import request from 'supertest'
import express from 'express'
import { handleWebhook } from '../controllers/billing.controller'
import prisma from '../config/prisma'

// var (pas let/const) — hoisted avec le corps de jest.mock, pas en TDZ
var mockWebhookEvent: any = null

jest.mock('../config/prisma', () => ({
  subscription: {
    findUnique: jest.fn(),
    create:     jest.fn().mockResolvedValue({}),
    update:     jest.fn().mockResolvedValue({}),
    delete:     jest.fn().mockResolvedValue({}),
  },
  organization: {
    update: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    customers: {
      retrieve: jest.fn().mockResolvedValue({
        deleted: false,
        metadata: { orgId: 'org1' },
      }),
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation(() => {
        // mockWebhookEvent est lu à l'appel (fermeture), pas à la création
        if (!mockWebhookEvent) throw new Error('No Stripe signature')
        return mockWebhookEvent
      }),
    },
  }))
)

process.env.STRIPE_SECRET_KEY     = 'sk_test_xxx'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.STRIPE_PRICE_STARTER  = 'price_starter'
process.env.STRIPE_PRICE_PRO      = 'price_pro'
process.env.STRIPE_PRICE_ADVISOR  = 'price_advisor'

const app = express()
app.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook)

const PERIOD_END = Math.floor(Date.now() / 1000) + 2_592_000

function makeSubEvent(
  status: string,
  type = 'customer.subscription.updated',
  // periodEndOnSub: simule API < 2025-09-30 ; false simule API 2025-09-30.clover (champ sur l'item)
  periodEndOnSub = true,
) {
  const itemBase = { price: { id: 'price_starter' }, current_period_end: PERIOD_END }
  const subBase: Record<string, any> = {
    id:       'sub_test123',
    customer: 'cus_test123',
    status,
    metadata: { orgId: 'org1' },
    items:    { data: [itemBase] },
  }
  if (periodEndOnSub) subBase.current_period_end = PERIOD_END
  return { type, data: { object: subBase } }
}

describe('handleWebhook — mapping statuts Stripe → SubscriptionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.subscription.create as jest.Mock).mockResolvedValue({})
    ;(prisma.organization.update as jest.Mock).mockResolvedValue({})
  })

  // Régression : sub.status.toUpperCase() donnait TRIALING/INCOMPLETE/UNPAID
  // non présents dans l'enum SubscriptionStatus → PrismaClientValidationError → 500
  it.each([
    ['active',             200],
    ['trialing',           200], // bug : TRIALING pas dans l'enum → 500
    ['past_due',           200], // mappé → PAST_DUE
    ['incomplete',         200], // mappé → INACTIVE
    ['incomplete_expired', 200], // mappé → INACTIVE
    ['unpaid',             200], // mappé → INACTIVE
    ['paused',             200], // mappé → INACTIVE
  ])('status=%s → HTTP %i', async (status, expected) => {
    mockWebhookEvent = makeSubEvent(status)
    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'sig_test')
      .send(Buffer.from('{}'))
    expect(res.status).toBe(expected)
    expect(res.body).toEqual({ received: true })
  })

  it('retourne 400 si la signature Stripe est invalide', async () => {
    mockWebhookEvent = null
    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'bad_sig')
      .send(Buffer.from('{}'))
    expect(res.status).toBe(400)
  })

  it('gère customer.subscription.created avec status=active', async () => {
    mockWebhookEvent = makeSubEvent('active', 'customer.subscription.created')
    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'sig_test')
      .send(Buffer.from('{}'))
    expect(res.status).toBe(200)
  })

  // Régression API 2025-09-30.clover : current_period_end absent de la subscription,
  // uniquement sur l'item → sub.current_period_end = undefined → new Date(NaN) → 500
  it('ne doit pas 500 quand current_period_end est absent de la subscription (API 2025-09-30)', async () => {
    mockWebhookEvent = makeSubEvent('active', 'customer.subscription.updated', false)
    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'sig_test')
      .send(Buffer.from('{}'))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ received: true })
  })
})
