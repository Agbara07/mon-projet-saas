import request from 'supertest'
import express from 'express'
import billingRoutes from '../routes/billing.routes'
import prisma from '../config/prisma'
import jwt from 'jsonwebtoken'

jest.mock('../config/prisma', () => ({
  subscription: { findUnique: jest.fn(), upsert: jest.fn() },
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
process.env.JWT_SECRET = 'test_secret'
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
process.env.FRONTEND_URL = 'http://localhost:3000'

const app = express()
app.use(express.json())
app.use('/billing', billingRoutes)

describe('POST /billing/checkout', () => {
  it('retourne une URL Stripe checkout', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ priceId: 'price_pro' })

    expect(res.status).toBe(200)
    expect(res.body.url).toContain('stripe.com')
  })
})

describe('POST /billing/portal', () => {
  it('retourne une URL portail Stripe', async () => {
    ;(prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      stripeCustomerId: 'cus_123',
    })

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
})
