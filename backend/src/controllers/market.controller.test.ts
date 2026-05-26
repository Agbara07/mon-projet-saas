import request from 'supertest'
import express  from 'express'
import jwt      from 'jsonwebtoken'
import {
  quote, search, marketOverview,
  brvmBackfill, brvmRefresh,
  brvmTransactionCost, providersStatus,
} from './market.controller'
import { authenticate } from '../middlewares/auth.middleware'

// ── Env ───────────────────────────────────────────────────────
process.env.JWT_SECRET    = 'test-jwt-secret-32chars-minimum!!'
process.env.CRON_SECRET   = 'test-cron-secret'

// ── Mocks ─────────────────────────────────────────────────────
jest.mock('../services/market/market-router', () => ({
  marketRouter: {
    getQuote:         jest.fn(),
    searchSymbols:    jest.fn(),
    getMarketOverview:jest.fn(),
    getQuotes:        jest.fn(),
    getCacheStats:    jest.fn().mockReturnValue({ size: 0, providers: [] }),
  },
  benzingaProvider:  { getAnalystRatings: jest.fn() },
  tmxProvider:       { getCorporateEvents: jest.fn(), getTSXQuote: jest.fn() },
  etfGlobalProvider: {
    getETFDetails: jest.fn(), getETFHoldings: jest.fn(),
    getETFSectorExposure: jest.fn(), getETFPerformance: jest.fn(), getETFsByCategory: jest.fn(),
  },
  brvmProvider: {
    getQuote: jest.fn(), getHistorical: jest.fn(),
    getBRVMQuotes: jest.fn(), getBRVMIndices: jest.fn(),
    getBRVMSectors: jest.fn(), getBRVMCountries: jest.fn(),
    getBRVMMarketStats: jest.fn(), getBRVMCompanies: jest.fn(),
  },
  fmpProvider: {
    getFundamentals: jest.fn(), getAnalystEstimates: jest.fn(), getDCF: jest.fn(),
    getIncomeStatements: jest.fn(), getBalanceSheets: jest.fn(), getCashFlows: jest.fn(),
  },
}))

jest.mock('../services/brvm-cron.service', () => ({
  getCacheStatus:  jest.fn().mockResolvedValue({ size: 0 }),
  refreshBRVMData: jest.fn().mockResolvedValue({ success: true, refreshed: 29 }),
  runBackfill:     jest.fn().mockResolvedValue({
    success: true,
    sources: [{ name: 'sikafinance', symbols: 29, rows: 1855 }],
    total: { symbols: 29, rows: 1855 },
    durationMs: 21251,
  }),
}))

jest.mock('../services/market/providers/brvm-liquidity.provider', () => ({
  getAllLiquidityScores: jest.fn().mockReturnValue([]),
  computeLiquidityScore: jest.fn().mockReturnValue({}),
}))

jest.mock('../services/market/providers/brvm-dividends.provider', () => ({
  computeDividendData: jest.fn().mockReturnValue({}),
}))

jest.mock('../services/market/providers/brvm-commodities.provider', () => ({
  computeCommodityCorrelation: jest.fn().mockResolvedValue({}),
  COMMODITY_MAP: {},
}))

jest.mock('../services/market/providers/brvm-africa.provider', () => ({
  getAfricanMarketsComparison: jest.fn().mockReturnValue([]),
}))

jest.mock('../services/market/providers/brvm-macro.provider', () => ({
  getUEMOAMacroDashboard: jest.fn().mockReturnValue({}),
}))

jest.mock('../services/market/providers/brvm-governance.provider', () => ({
  getAllGovernanceScores: jest.fn().mockReturnValue([]),
  computeGovernanceScore: jest.fn().mockReturnValue({}),
}))

jest.mock('../services/market/providers/brvm-transaction-cost.provider', () => ({
  simulateTransactionCost: jest.fn().mockReturnValue({
    grossAmount: 1_000_000, brokerFee: 6_000, brvmFee: 1_500,
    crepmfFee: 300, csdFee: 200, totalFees: 8_000,
    totalFeePct: 0.8, netAmount: 992_000, breakEvenYield: 1.6,
  }),
}))

jest.mock('../services/market/providers/fred.provider', () => ({
  getUSMacroDashboard: jest.fn().mockResolvedValue({}),
}))

jest.mock('../config/prisma', () => ({
  default: {
    bRVMPriceHistory: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))

// ── App de test ───────────────────────────────────────────────
const app = express()
app.use(express.json())

// Routes publiques (pas de JWT)
app.get('/overview',        marketOverview)
app.post('/brvm/backfill',  brvmBackfill)
app.post('/brvm/refresh',   brvmRefresh)

// Routes protégées par JWT
app.use(authenticate)
app.get('/status',          providersStatus)
app.get('/search',          search)
app.get('/:symbol/quote',   quote)
app.post('/brvm/tools/cost', brvmTransactionCost)

// ── Token helper ──────────────────────────────────────────────
const token = () =>
  jwt.sign({ userId: 'u-1', orgId: 'org-1', role: 'MEMBER' }, process.env.JWT_SECRET!, { expiresIn: '15m' })

// ── Import du mock marketRouter pour les assertions ──────────
import { marketRouter } from '../services/market/market-router'
import { runBackfill, refreshBRVMData } from '../services/brvm-cron.service'
import { simulateTransactionCost } from '../services/market/providers/brvm-transaction-cost.provider'

afterEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════════
// GET /overview — route publique
// ═══════════════════════════════════════════════════════════════
describe('GET /overview', () => {
  it('retourne les données du marché → 200', async () => {
    ;(marketRouter.getMarketOverview as jest.Mock).mockResolvedValue([
      { symbol: 'AAPL', price: 180, change: 1, changePercent: 0.5, name: 'Apple', volume: 1e6, currency: 'USD' },
    ])
    const res = await request(app).get('/overview')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('erreur provider → 502 avec message générique', async () => {
    ;(marketRouter.getMarketOverview as jest.Mock).mockRejectedValue(new Error('timeout'))
    const res = await request(app).get('/overview')
    expect(res.status).toBe(502)
    expect(res.body).toHaveProperty('message', 'Données de marché temporairement indisponibles')
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /:symbol/quote — route JWT
// ═══════════════════════════════════════════════════════════════
describe('GET /:symbol/quote', () => {
  it('retourne la cotation → 200', async () => {
    ;(marketRouter.getQuote as jest.Mock).mockResolvedValue({
      symbol: 'AAPL', price: 180, change: 1, changePercent: 0.5, name: 'Apple', volume: 1e6, currency: 'USD',
    })
    const res = await request(app)
      .get('/AAPL/quote')
      .set('Authorization', `Bearer ${token()}`)
    expect(res.status).toBe(200)
    expect(res.body.symbol).toBe('AAPL')
  })

  it('met le symbole en majuscules avant de l\'envoyer au provider', async () => {
    ;(marketRouter.getQuote as jest.Mock).mockResolvedValue({ symbol: 'TSLA', price: 250, change: 0, changePercent: 0, name: 'Tesla', volume: 1e6, currency: 'USD' })
    await request(app).get('/tsla/quote').set('Authorization', `Bearer ${token()}`)
    expect(marketRouter.getQuote).toHaveBeenCalledWith('TSLA')
  })

  it('sans JWT → 401', async () => {
    const res = await request(app).get('/AAPL/quote')
    expect(res.status).toBe(401)
    expect(marketRouter.getQuote).not.toHaveBeenCalled()
  })

  it('erreur provider → 502', async () => {
    ;(marketRouter.getQuote as jest.Mock).mockRejectedValue(new Error('provider down'))
    const res = await request(app)
      .get('/AAPL/quote')
      .set('Authorization', `Bearer ${token()}`)
    expect(res.status).toBe(502)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /search — route JWT
// ═══════════════════════════════════════════════════════════════
describe('GET /search', () => {
  it('retourne les résultats de recherche → 200', async () => {
    ;(marketRouter.searchSymbols as jest.Mock).mockResolvedValue([{ symbol: 'AAPL', name: 'Apple', exchange: 'NASDAQ' }])
    const res = await request(app)
      .get('/search?q=AAPL')
      .set('Authorization', `Bearer ${token()}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('paramètre q manquant → 400', async () => {
    const res = await request(app)
      .get('/search')
      .set('Authorization', `Bearer ${token()}`)
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message', 'Paramètre q requis')
    expect(marketRouter.searchSymbols).not.toHaveBeenCalled()
  })

  it('sans JWT → 401', async () => {
    const res = await request(app).get('/search?q=AAPL')
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════
// POST /brvm/backfill — CRON_SECRET
// ═══════════════════════════════════════════════════════════════
describe('POST /brvm/backfill', () => {
  it('sans header x-cron-secret → 401', async () => {
    const res = await request(app).post('/brvm/backfill')
    expect(res.status).toBe(401)
    expect(runBackfill).not.toHaveBeenCalled()
  })

  it('mauvais secret → 401', async () => {
    const res = await request(app)
      .post('/brvm/backfill')
      .set('x-cron-secret', 'wrong-secret')
    expect(res.status).toBe(401)
    expect(runBackfill).not.toHaveBeenCalled()
  })

  it('bon secret → 200 + résultat runBackfill()', async () => {
    const res = await request(app)
      .post('/brvm/backfill')
      .set('x-cron-secret', 'test-cron-secret')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.total.rows).toBe(1855)
    expect(runBackfill).toHaveBeenCalledTimes(1)
  })

  it('CRON_SECRET vide dans l\'env → 401 même avec bon header', async () => {
    const original = process.env.CRON_SECRET
    process.env.CRON_SECRET = ''
    const res = await request(app)
      .post('/brvm/backfill')
      .set('x-cron-secret', 'test-cron-secret')
    expect(res.status).toBe(401)
    process.env.CRON_SECRET = original
  })
})

// ═══════════════════════════════════════════════════════════════
// POST /brvm/refresh — CRON_SECRET
// ═══════════════════════════════════════════════════════════════
describe('POST /brvm/refresh', () => {
  it('sans secret → 401', async () => {
    const res = await request(app).post('/brvm/refresh')
    expect(res.status).toBe(401)
  })

  it('bon secret → 200 + résultat refreshBRVMData()', async () => {
    const res = await request(app)
      .post('/brvm/refresh')
      .set('x-cron-secret', 'test-cron-secret')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(refreshBRVMData).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// POST /brvm/tools/cost — validation + calcul
// ═══════════════════════════════════════════════════════════════
describe('POST /brvm/tools/cost', () => {
  it('body incomplet (manque country) → 400', async () => {
    const res = await request(app)
      .post('/brvm/tools/cost')
      .set('Authorization', `Bearer ${token()}`)
      .send({ amount: 500_000, type: 'buy' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message', 'Champs requis: amount, type, country')
    expect(simulateTransactionCost).not.toHaveBeenCalled()
  })

  it('body valide → 200 + résultat simulateTransactionCost()', async () => {
    const res = await request(app)
      .post('/brvm/tools/cost')
      .set('Authorization', `Bearer ${token()}`)
      .send({ amount: 1_000_000, type: 'buy', includeTax: false, country: 'CI' })
    expect(res.status).toBe(200)
    expect(res.body.netAmount).toBe(992_000)
    expect(simulateTransactionCost).toHaveBeenCalledTimes(1)
  })

  it('sans JWT → 401', async () => {
    const res = await request(app)
      .post('/brvm/tools/cost')
      .send({ amount: 1_000_000, type: 'buy', country: 'CI' })
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════════
// GET /status — route JWT
// ═══════════════════════════════════════════════════════════════
describe('GET /status', () => {
  it('retourne le statut des providers → 200', async () => {
    const res = await request(app)
      .get('/status')
      .set('Authorization', `Bearer ${token()}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('size')
    expect(res.body).toHaveProperty('providers')
  })

  it('sans JWT → 401', async () => {
    const res = await request(app).get('/status')
    expect(res.status).toBe(401)
  })
})
