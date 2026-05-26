import request from 'supertest'
import express  from 'express'
import {
  euronextPalmares, euronextStocks, euronextIndices,
  euronextForex, euronextCommodities, euronextOverview,
} from './euronext.controller'

// ── Mocks ─────────────────────────────────────────────────────
jest.mock('../services/market/providers/euronext.provider', () => ({
  getEuropeanPalmares:   jest.fn(),
  getCAC40Quotes:        jest.fn(),
  getEuropeanIndices:    jest.fn(),
  getEuropeanForex:      jest.fn(),
  getEuropeanCommodities:jest.fn(),
}))

jest.mock('../services/market/providers/fmp.provider', () => ({
  FMPProvider: jest.fn().mockImplementation(() => ({
    getInsiderTransactions: jest.fn(),
  })),
}))

// ── Import des mocks pour assertions ─────────────────────────
import {
  getEuropeanPalmares,
  getCAC40Quotes,
  getEuropeanIndices,
  getEuropeanForex,
  getEuropeanCommodities,
} from '../services/market/providers/euronext.provider'

// ── Fixtures ─────────────────────────────────────────────────
const mockPalmares    = { gainers: [{ symbol: 'SAF.PA', changePercent: 5.79 }], losers: [] }
const mockCAC40Quotes = [{ symbol: 'LVMH.PA', price: 720, changePercent: 1.2 }]
const mockIndices     = [{ name: 'CAC 40', symbol: 'EWQ', price: 85.5, changePercent: 0.8 }]
const mockForex       = [{ pair: 'EUR/USD', rate: 1.164, change: 0, changePercent: 0 }]
const mockCommodities = [{ name: 'Or', symbol: 'GLD', price: 227, changePercent: 0.3 }]

// ── App de test (routes publiques, pas de JWT requis) ────────
const app = express()
app.use(express.json())
app.get('/euronext',             euronextOverview)
app.get('/euronext/palmares',    euronextPalmares)
app.get('/euronext/stocks',      euronextStocks)
app.get('/euronext/indices',     euronextIndices)
app.get('/euronext/forex',       euronextForex)
app.get('/euronext/commodities', euronextCommodities)

afterEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════════
// GET /euronext/palmares
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext/palmares', () => {
  it('retourne les gainers/losers → 200', async () => {
    ;(getEuropeanPalmares as jest.Mock).mockResolvedValue(mockPalmares)
    const res = await request(app).get('/euronext/palmares')
    expect(res.status).toBe(200)
    expect(res.body.gainers[0].symbol).toBe('SAF.PA')
  })

  it('erreur provider → 500 + { error }', async () => {
    ;(getEuropeanPalmares as jest.Mock).mockRejectedValue(new Error('network error'))
    const res = await request(app).get('/euronext/palmares')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error', 'network error')
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /euronext/stocks
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext/stocks', () => {
  it('retourne quotes + updatedAt → 200', async () => {
    ;(getCAC40Quotes as jest.Mock).mockResolvedValue(mockCAC40Quotes)
    const res = await request(app).get('/euronext/stocks')
    expect(res.status).toBe(200)
    expect(res.body.quotes[0].symbol).toBe('LVMH.PA')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('erreur provider → 500', async () => {
    ;(getCAC40Quotes as jest.Mock).mockRejectedValue(new Error('timeout'))
    const res = await request(app).get('/euronext/stocks')
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /euronext/indices
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext/indices', () => {
  it('retourne indices + updatedAt → 200', async () => {
    ;(getEuropeanIndices as jest.Mock).mockResolvedValue(mockIndices)
    const res = await request(app).get('/euronext/indices')
    expect(res.status).toBe(200)
    expect(res.body.indices[0].name).toBe('CAC 40')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('erreur provider → 500', async () => {
    ;(getEuropeanIndices as jest.Mock).mockRejectedValue(new Error('api down'))
    const res = await request(app).get('/euronext/indices')
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /euronext/forex
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext/forex', () => {
  it('retourne forex + updatedAt → 200', async () => {
    ;(getEuropeanForex as jest.Mock).mockResolvedValue(mockForex)
    const res = await request(app).get('/euronext/forex')
    expect(res.status).toBe(200)
    expect(res.body.forex[0].pair).toBe('EUR/USD')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('erreur provider → 500', async () => {
    ;(getEuropeanForex as jest.Mock).mockRejectedValue(new Error('bce down'))
    const res = await request(app).get('/euronext/forex')
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /euronext/commodities
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext/commodities', () => {
  it('retourne commodities + updatedAt → 200', async () => {
    ;(getEuropeanCommodities as jest.Mock).mockResolvedValue(mockCommodities)
    const res = await request(app).get('/euronext/commodities')
    expect(res.status).toBe(200)
    expect(res.body.commodities[0].name).toBe('Or')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('erreur provider → 500', async () => {
    ;(getEuropeanCommodities as jest.Mock).mockRejectedValue(new Error('gld down'))
    const res = await request(app).get('/euronext/commodities')
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /euronext — overview (Promise.allSettled)
// ═══════════════════════════════════════════════════════════════
describe('GET /euronext (overview)', () => {
  it('retourne toutes les données combinées → 200', async () => {
    ;(getEuropeanPalmares    as jest.Mock).mockResolvedValue(mockPalmares)
    ;(getEuropeanIndices     as jest.Mock).mockResolvedValue(mockIndices)
    ;(getEuropeanForex       as jest.Mock).mockResolvedValue(mockForex)
    ;(getEuropeanCommodities as jest.Mock).mockResolvedValue(mockCommodities)

    const res = await request(app).get('/euronext')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('palmares')
    expect(res.body).toHaveProperty('indices')
    expect(res.body).toHaveProperty('forex')
    expect(res.body).toHaveProperty('commodities')
    expect(res.body).toHaveProperty('updatedAt')
  })

  it('provider partiel en erreur → 200 avec valeur null/[] pour ce champ (Promise.allSettled)', async () => {
    ;(getEuropeanPalmares    as jest.Mock).mockRejectedValue(new Error('palmares down'))
    ;(getEuropeanIndices     as jest.Mock).mockResolvedValue(mockIndices)
    ;(getEuropeanForex       as jest.Mock).mockResolvedValue(mockForex)
    ;(getEuropeanCommodities as jest.Mock).mockResolvedValue(mockCommodities)

    const res = await request(app).get('/euronext')
    expect(res.status).toBe(200)
    expect(res.body.palmares).toBeNull()     // rejected → null
    expect(res.body.indices).toEqual(mockIndices)
  })
})
