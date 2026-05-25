import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import portfolioRoutes from '../routes/portfolio.routes'
import prisma from '../config/prisma'
import { marketRouter } from '../services/market/market-router'

process.env.JWT_SECRET = 'test-jwt-secret-32chars-minimum!!'

jest.mock('../config/prisma', () => ({
  portfolio: {
    findMany:   jest.fn(),
    create:     jest.fn(),
    deleteMany: jest.fn(),
    findFirst:  jest.fn(),
  },
  holding: {
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
    findFirst:  jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
}))

// planGuard contourne le check de quota — on teste le controller, pas le middleware
jest.mock('../middlewares/plan-guard.middleware', () => ({
  planGuard: () => (_req: any, _res: any, next: any) => next(),
}))

jest.mock('../services/market/market-router', () => ({
  marketRouter: { getQuotes: jest.fn() },
}))

const app = express()
app.use(express.json())
app.use('/portfolios', portfolioRoutes)

const token = (userId: string) =>
  jwt.sign({ userId, orgId: 'org-1', role: 'MEMBER' }, process.env.JWT_SECRET!, { expiresIn: '15m' })

const mockPortfolio = {
  id:          'port-1',
  name:        'Mon Portefeuille',
  description: null,
  userId:      'user-1',
  createdAt:   new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
  holdings:    [],
}

afterEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════
// GET /portfolios
// ═══════════════════════════════════════════════════════════
describe('GET /portfolios', () => {
  it('retourne les portfolios de l\'utilisateur → 200', async () => {
    ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue([mockPortfolio])

    const res = await request(app).get('/portfolios').set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Mon Portefeuille')
  })

  it('refuse sans token → 401, ne touche pas la BDD', async () => {
    const res = await request(app).get('/portfolios')

    expect(res.status).toBe(401)
    expect(prisma.portfolio.findMany).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /portfolios
// ═══════════════════════════════════════════════════════════
describe('POST /portfolios', () => {
  it('crée un portfolio et lie userId depuis le JWT (pas du body) → 201', async () => {
    ;(prisma.portfolio.create as jest.Mock).mockResolvedValue(mockPortfolio)

    const res = await request(app)
      .post('/portfolios')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ name: 'Mon Portefeuille' })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Mon Portefeuille')
    // userId provient du JWT, pas du body — protection contre mass assignment
    expect(prisma.portfolio.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) })
    )
  })
})

// ═══════════════════════════════════════════════════════════
// DELETE /portfolios/:id
// ═══════════════════════════════════════════════════════════
describe('DELETE /portfolios/:id', () => {
  it('supprime le portfolio de l\'utilisateur courant → 200', async () => {
    ;(prisma.portfolio.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await request(app)
      .delete('/portfolios/port-1')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(prisma.portfolio.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'port-1', userId: 'user-1' }) })
    )
  })

  it('[SEC-002] IDOR : user-2 ne peut pas supprimer le portfolio de user-1 → 404', async () => {
    ;(prisma.portfolio.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

    const res = await request(app)
      .delete('/portfolios/port-1')
      .set('Authorization', `Bearer ${token('user-2')}`)

    expect(res.status).toBe(404)
    // La clause userId dans deleteMany filtre correctement
    expect(prisma.portfolio.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-2' }) })
    )
  })

  it('retourne 404 pour un ID inexistant → 404', async () => {
    ;(prisma.portfolio.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })

    const res = await request(app)
      .delete('/portfolios/inexistant')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════
// GET /portfolios/:id (enrichi avec prix marché)
// ═══════════════════════════════════════════════════════════
describe('GET /portfolios/:id', () => {
  it('retourne le portfolio avec P&L calculé via prix du marché → 200', async () => {
    ;(prisma.portfolio.findFirst as jest.Mock).mockResolvedValue({
      ...mockPortfolio,
      holdings: [
        { id: 'h-1', symbol: 'AAPL', quantity: 10, avgBuyPrice: 150, companyName: 'Apple', portfolioId: 'port-1', transactions: [] },
      ],
    })
    ;(marketRouter.getQuotes as jest.Mock).mockResolvedValue([{ symbol: 'AAPL', price: 180 }])

    const res = await request(app).get('/portfolios/port-1').set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body.holdings[0].currentPrice).toBe(180)
    expect(res.body.totalValue).toBeCloseTo(1800)
    expect(res.body.totalCost).toBeCloseTo(1500)
    expect(res.body.totalPnl).toBeCloseTo(300)
    expect(res.body.totalPnlPct).toBeCloseTo(20)
  })

  it('P&L = 0 si les providers échouent — fallback sur avgBuyPrice (pas de crash)', async () => {
    ;(prisma.portfolio.findFirst as jest.Mock).mockResolvedValue({
      ...mockPortfolio,
      holdings: [
        { id: 'h-1', symbol: 'AAPL', quantity: 10, avgBuyPrice: 150, companyName: 'Apple', portfolioId: 'port-1', transactions: [] },
      ],
    })
    ;(marketRouter.getQuotes as jest.Mock).mockRejectedValue(new Error('Provider down'))

    const res = await request(app).get('/portfolios/port-1').set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body.holdings[0].currentPrice).toBe(150) // fallback = avgBuyPrice
    expect(res.body.totalPnl).toBe(0)
  })

  it('retourne 404 pour un portfolio appartenant à un autre utilisateur', async () => {
    ;(prisma.portfolio.findFirst as jest.Mock).mockResolvedValue(null)

    const res = await request(app).get('/portfolios/port-1').set('Authorization', `Bearer ${token('user-2')}`)

    expect(res.status).toBe(404)
  })

  it('retourne totalValue=0 pour un portfolio sans positions', async () => {
    ;(prisma.portfolio.findFirst as jest.Mock).mockResolvedValue({ ...mockPortfolio, holdings: [] })

    const res = await request(app).get('/portfolios/port-1').set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(res.body.totalValue).toBe(0)
    expect(res.body.totalPnl).toBe(0)
    expect(marketRouter.getQuotes).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /portfolios/:id/holdings
// ═══════════════════════════════════════════════════════════
describe('POST /portfolios/:id/holdings', () => {
  it('crée une nouvelle position et enregistre une transaction BUY → 201', async () => {
    ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.holding.create as jest.Mock).mockResolvedValue({
      id: 'h-1', symbol: 'AAPL', quantity: 10, avgBuyPrice: 150, portfolioId: 'port-1',
    })
    ;(prisma.transaction.create as jest.Mock).mockResolvedValue({})

    const res = await request(app)
      .post('/portfolios/port-1/holdings')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', quantity: 10, avgBuyPrice: 150, companyName: 'Apple' })

    expect(res.status).toBe(201)
    expect(res.body.symbol).toBe('AAPL')
    expect(prisma.transaction.create).toHaveBeenCalledTimes(1)
  })

  it('moyenne le prix d\'achat si la position existe déjà (re-achat)', async () => {
    ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue({
      id: 'h-1', symbol: 'AAPL', quantity: 10, avgBuyPrice: 150, portfolioId: 'port-1',
    })
    ;(prisma.holding.update as jest.Mock).mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'h-1', symbol: 'AAPL', ...data, portfolioId: 'port-1' })
    )
    ;(prisma.transaction.create as jest.Mock).mockResolvedValue({})

    const res = await request(app)
      .post('/portfolios/port-1/holdings')
      .set('Authorization', `Bearer ${token('user-1')}`)
      .send({ symbol: 'AAPL', quantity: 10, avgBuyPrice: 170, companyName: 'Apple' })

    expect(res.status).toBe(201)
    const updateCall = (prisma.holding.update as jest.Mock).mock.calls[0][0]
    expect(updateCall.data.quantity).toBe(20)
    // (150*10 + 170*10) / 20 = 160
    expect(updateCall.data.avgBuyPrice).toBeCloseTo(160, 1)
  })
})

// ═══════════════════════════════════════════════════════════
// DELETE /portfolios/:id/holdings/:holdingId
// ═══════════════════════════════════════════════════════════
describe('DELETE /portfolios/:id/holdings/:holdingId', () => {
  it('supprime la position de l\'utilisateur courant → 200', async () => {
    ;(prisma.holding.findFirst as jest.Mock).mockResolvedValue({
      id: 'h-1', symbol: 'AAPL', portfolioId: 'port-1',
    })
    ;(prisma.holding.delete as jest.Mock).mockResolvedValue({})

    const res = await request(app)
      .delete('/portfolios/port-1/holdings/h-1')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(res.status).toBe(200)
    expect(prisma.holding.delete).toHaveBeenCalledWith({ where: { id: 'h-1' } })
  })

  it('[SEC-003] IDOR : user-2 ne peut pas supprimer la position de user-1 → 404', async () => {
    // findFirst retourne null car la clause portfolio.userId filtre l'accès
    ;(prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)

    const res = await request(app)
      .delete('/portfolios/port-1/holdings/h-1')
      .set('Authorization', `Bearer ${token('user-2')}`)

    expect(res.status).toBe(404)
    expect(prisma.holding.delete).not.toHaveBeenCalled()
  })

  it('la requête findFirst filtre bien par userId du portfolio (pas holdingId seul)', async () => {
    ;(prisma.holding.findFirst as jest.Mock).mockResolvedValue(null)

    await request(app)
      .delete('/portfolios/port-1/holdings/h-1')
      .set('Authorization', `Bearer ${token('user-1')}`)

    expect(prisma.holding.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'h-1',
          portfolio: expect.objectContaining({ userId: 'user-1' }),
        }),
      })
    )
  })
})
