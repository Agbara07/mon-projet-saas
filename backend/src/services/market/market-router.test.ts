/**
 * Tests de la logique interne de MarketRouter :
 * - cache hit/miss
 * - fallback multi-provider (withFallback)
 * - getQuotes() cascade (fix commit adbb105)
 * - filtres screener
 */
import { marketRouter } from './market-router'
import { cache }          from './cache'
import { circuitBreaker } from './circuit-breaker'
import type { Quote }      from './types'

// ── Pattern : chaque factory stocke l'instance dans __m ─────────
// Les factories s'exécutent au premier require (quand market-router.ts charge ses deps).
// __m est exposé via jest.requireMock() dans les tests.

function mkProvider(name: string, priority: number) {
  return {
    name, priority,
    getQuote:            jest.fn(),
    getQuotes:           jest.fn(),
    getHistorical:       jest.fn(),
    getProfile:          jest.fn(),
    getNews:             jest.fn(),
    searchSymbols:       jest.fn(),
    getEarningsCalendar: jest.fn(),
    getMarketOverview:   jest.fn(),
    getTechnicalIndicators: jest.fn(),
  }
}

jest.mock('./providers/finnhub.provider',       () => { const __m = mkProvider('finnhub', 1);      return { FinnhubProvider:      jest.fn(() => __m), __m } })
jest.mock('./providers/twelvedata.provider',    () => { const __m = mkProvider('twelvedata', 2);   return { TwelveDataProvider:   jest.fn(() => __m), __m } })
jest.mock('./providers/polygon.provider',       () => { const __m = mkProvider('polygon', 3);      return { PolygonProvider:      jest.fn(() => __m), __m } })
jest.mock('./providers/eodhd.provider',         () => { const __m = mkProvider('eodhd', 4);        return { EODHDProvider:        jest.fn(() => __m), __m } })
jest.mock('./providers/alpha-vantage.provider', () => { const __m = mkProvider('alphavantage', 5); return { AlphaVantageProvider: jest.fn(() => __m), __m } })
jest.mock('./providers/marketstack.provider',   () => { const __m = mkProvider('marketstack', 6);  return { MarketstackProvider:  jest.fn(() => __m), __m } })
jest.mock('./providers/marketdata.provider',    () => { const __m = mkProvider('marketdata', 7);   return { MarketDataProvider:   jest.fn(() => __m), __m } })
jest.mock('./providers/iex.provider',           () => { const __m = mkProvider('iex', 8);          return { IEXProvider:          jest.fn(() => __m), __m } })
jest.mock('./providers/benzinga.provider',      () => { const __m = mkProvider('benzinga', 9);     return { BenzingaProvider:     jest.fn(() => __m), __m } })
jest.mock('./providers/tmx.provider',           () => { const __m = mkProvider('tmx', 10);         return { TMXProvider:          jest.fn(() => __m), __m } })
jest.mock('./providers/etf-global.provider',    () => { const __m = mkProvider('etf-global', 11);  return { ETFGlobalProvider:    jest.fn(() => __m), __m } })
jest.mock('./providers/brvm.provider',          () => { const __m = mkProvider('brvm', 12);        return { BRVMProvider:         jest.fn(() => __m), __m } })
jest.mock('./providers/fmp.provider',           () => { const __m = mkProvider('fmp', 13);         return { FMPProvider:          jest.fn(() => __m), __m } })

// ── Accès aux instances mockées ───────────────────────────────
const rm = (path: string) => (jest.requireMock(path) as any).__m

// ── Fixture quote ──────────────────────────────────────────────
const q = (symbol: string, price = 150): Quote => ({
  symbol, name: symbol, price, change: 1, changePercent: 0.7,
  volume: 1_000_000, currency: 'USD', provider: 'test',
})

// ── Reset entre chaque test ────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks()
  ;(cache as any)['store'].clear()
  ;(circuitBreaker as any)['state'].clear()

  // Tous les providers rejettent par défaut
  for (const path of [
    './providers/finnhub.provider',    './providers/twelvedata.provider',
    './providers/polygon.provider',    './providers/eodhd.provider',
    './providers/alpha-vantage.provider', './providers/marketstack.provider',
    './providers/marketdata.provider', './providers/iex.provider',
    './providers/benzinga.provider',   './providers/tmx.provider',
    './providers/etf-global.provider', './providers/brvm.provider',
    './providers/fmp.provider',
  ]) {
    const m = rm(path)
    m.getQuote.mockRejectedValue(new Error('no key'))
    m.getQuotes.mockResolvedValue([])
    m.getHistorical.mockRejectedValue(new Error('no key'))
    m.getProfile.mockRejectedValue(new Error('no key'))
    m.getNews.mockRejectedValue(new Error('no key'))
    m.searchSymbols.mockRejectedValue(new Error('no key'))
    m.getEarningsCalendar.mockRejectedValue(new Error('no key'))
    m.getMarketOverview.mockRejectedValue(new Error('no key'))
  }
})

// ═══════════════════════════════════════════════════════════════
// getQuote — cache
// ═══════════════════════════════════════════════════════════════
describe('getQuote — cache', () => {
  it('appelle le provider la 1ère fois seulement', async () => {
    rm('./providers/finnhub.provider').getQuote.mockResolvedValue(q('AAPL'))
    await marketRouter.getQuote('AAPL')
    await marketRouter.getQuote('AAPL')
    expect(rm('./providers/finnhub.provider').getQuote).toHaveBeenCalledTimes(1)
  })

  it('retourne la même donnée depuis le cache', async () => {
    rm('./providers/finnhub.provider').getQuote.mockResolvedValue(q('AAPL', 180))
    const r1 = await marketRouter.getQuote('AAPL')
    const r2 = await marketRouter.getQuote('AAPL')
    expect(r1.price).toBe(r2.price)
  })
})

// ═══════════════════════════════════════════════════════════════
// getQuote — fallback
// ═══════════════════════════════════════════════════════════════
describe('getQuote — fallback', () => {
  it('utilise le provider 2 si le provider 1 échoue', async () => {
    rm('./providers/finnhub.provider').getQuote.mockRejectedValue(new Error('down'))
    rm('./providers/twelvedata.provider').getQuote.mockResolvedValue(q('AAPL', 180))
    const result = await marketRouter.getQuote('AAPL')
    expect(result.price).toBe(180)
  })

  it('lève une erreur si tous les providers échouent', async () => {
    await expect(marketRouter.getQuote('AAPL')).rejects.toThrow(/Tous les providers/)
  })
})

// ═══════════════════════════════════════════════════════════════
// getQuotes — cascade (fix commit adbb105)
// ═══════════════════════════════════════════════════════════════
describe('getQuotes — cascade multi-provider', () => {
  it('résout chaque symbole avec le premier provider qui retourne price > 0', async () => {
    rm('./providers/finnhub.provider').getQuotes.mockResolvedValue([
      q('AAPL', 180),
      q('MC.PA', 0),  // non résolu (price 0)
    ])
    rm('./providers/twelvedata.provider').getQuotes.mockResolvedValue([
      q('MC.PA', 890),
    ])

    const results = await marketRouter.getQuotes(['AAPL', 'MC.PA'])
    const bySymbol = Object.fromEntries(results.map(r => [r.symbol, r.price]))
    expect(bySymbol['AAPL']).toBe(180)
    expect(bySymbol['MC.PA']).toBe(890)
  })

  it('n\'appelle pas les providers pour les symboles déjà en cache', async () => {
    rm('./providers/finnhub.provider').getQuotes.mockResolvedValue([q('AAPL', 180)])
    await marketRouter.getQuotes(['AAPL'])

    jest.clearAllMocks()
    await marketRouter.getQuotes(['AAPL'])
    expect(rm('./providers/finnhub.provider').getQuotes).not.toHaveBeenCalled()
  })

  it('retourne FALLBACK_QUOTE (price=0) pour un symbole non résolvable', async () => {
    const results = await marketRouter.getQuotes(['UNKNOWN'])
    const fallback = results.find(r => r.symbol === 'UNKNOWN')
    expect(fallback).toBeDefined()
    expect(fallback!.price).toBe(0)
  })

  it('résout partiellement : AAPL résolu, INCONNUE en fallback', async () => {
    rm('./providers/finnhub.provider').getQuotes.mockResolvedValue([q('AAPL', 180)])
    const results = await marketRouter.getQuotes(['AAPL', 'INCONNUE'])
    const prices  = Object.fromEntries(results.map(r => [r.symbol, r.price]))
    expect(prices['AAPL']).toBe(180)
    expect(prices['INCONNUE']).toBe(0) // fallback
  })
})

// ═══════════════════════════════════════════════════════════════
// getHistorical — cache + fallback
// ═══════════════════════════════════════════════════════════════
describe('getHistorical', () => {
  const hist = [{ date: '2025-01-02', open: 175, high: 180, low: 174, close: 178, volume: 1e6 }]

  it('retourne les données du premier provider disponible', async () => {
    rm('./providers/twelvedata.provider').getHistorical.mockResolvedValue(hist)
    expect(await marketRouter.getHistorical('AAPL', '1mo')).toEqual(hist)
  })

  it('utilise le cache au 2ème appel (provider non rappelé)', async () => {
    rm('./providers/twelvedata.provider').getHistorical.mockResolvedValue(hist)
    await marketRouter.getHistorical('AAPL', '1mo')
    await marketRouter.getHistorical('AAPL', '1mo')
    expect(rm('./providers/twelvedata.provider').getHistorical).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// screenStocks — filtres
// ═══════════════════════════════════════════════════════════════
describe('screenStocks — filtres', () => {
  const quotes: Quote[] = [
    { ...q('AAPL', 200), marketCap: 3e12, pe: 30, changePercent: 2, volume: 80e6 },
    { ...q('MSFT', 50),  marketCap: 1e12, pe: 25, changePercent: -1, volume: 30e6 },
    { ...q('XOM', 120),  marketCap: 5e11, pe: 12, changePercent: 0.5, volume: 20e6 },
  ]

  beforeEach(() => {
    rm('./providers/finnhub.provider').getQuotes.mockResolvedValue(quotes)
  })

  it('minPrice filtre les symboles sous le seuil', async () => {
    const results = await marketRouter.screenStocks({ minPrice: 100 })
    expect(results.find(r => r.symbol === 'MSFT')).toBeUndefined() // price 50 < 100
  })

  it('maxPrice filtre les symboles au-dessus du seuil', async () => {
    const results = await marketRouter.screenStocks({ maxPrice: 100 })
    expect(results.find(r => r.symbol === 'AAPL')).toBeUndefined() // price 200 > 100
  })

  it('sector filtre par SECTOR_MAP statique', async () => {
    const tech = await marketRouter.screenStocks({ sector: 'Technology' })
    expect(tech.find(r => r.symbol === 'XOM')).toBeUndefined() // XOM = Energy
    expect(tech.find(r => r.symbol === 'AAPL')).toBeDefined()
    expect(tech.find(r => r.symbol === 'MSFT')).toBeDefined()
  })

  it('sans filtre retourne toutes les quotes avec price > 0', async () => {
    const results = await marketRouter.screenStocks({})
    expect(results.length).toBe(3)
    expect(results.every(r => r.price > 0)).toBe(true)
  })
})
