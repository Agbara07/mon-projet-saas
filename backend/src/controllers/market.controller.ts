import { Request, Response } from 'express'
import { marketRouter, benzingaProvider, tmxProvider, etfGlobalProvider } from '../services/market/market-router'
import { ScreenerFilters } from '../services/market/types'

const handle = (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response) => {
    try { await fn(req, res) }
    catch (e: any) {
      console.error('[market]', e?.message)
      res.status(502).json({ message: 'Données de marché temporairement indisponibles', error: e?.message })
    }
  }

export const quote = handle(async (req, res) => {
  res.json(await marketRouter.getQuote(req.params.symbol.toUpperCase()))
})

export const historical = handle(async (req, res) => {
  const period = (req.query.period as string) || '1mo'
  res.json(await marketRouter.getHistorical(req.params.symbol.toUpperCase(), period))
})

export const profile = handle(async (req, res) => {
  res.json(await marketRouter.getProfile(req.params.symbol.toUpperCase()))
})

export const news = handle(async (req, res) => {
  res.json(await marketRouter.getNews(req.params.symbol.toUpperCase()))
})

export const search = handle(async (req, res) => {
  const q = req.query.q as string
  if (!q) return res.status(400).json({ message: 'Paramètre q requis' })
  res.json(await marketRouter.searchSymbols(q))
})

export const earningsCalendar = handle(async (_req, res) => {
  res.json(await marketRouter.getEarningsCalendar())
})

export const marketOverview = handle(async (_req, res) => {
  res.json(await marketRouter.getMarketOverview())
})

export const screener = handle(async (req, res) => {
  const f: ScreenerFilters = {
    minPrice:         req.query.minPrice         ? +req.query.minPrice         : undefined,
    maxPrice:         req.query.maxPrice         ? +req.query.maxPrice         : undefined,
    minMarketCap:     req.query.minMarketCap     ? +req.query.minMarketCap     : undefined,
    maxPE:            req.query.maxPE            ? +req.query.maxPE            : undefined,
    minChangePercent: req.query.minChangePercent ? +req.query.minChangePercent : undefined,
    maxChangePercent: req.query.maxChangePercent ? +req.query.maxChangePercent : undefined,
  }
  res.json(await marketRouter.screenStocks(f))
})

export const technicalIndicators = handle(async (req, res) => {
  const period = (req.query.period as string) || '3mo'
  res.json(await marketRouter.getTechnicalIndicators(req.params.symbol.toUpperCase(), period))
})

// Statut des providers
export const providersStatus = handle(async (_req, res) => {
  res.json(marketRouter.getCacheStats())
})

// ── Endpoints spécialisés ──────────────────────────────────

// Benzinga : analyst ratings
export const analystRatings = handle(async (req, res) => {
  const ratings = await (benzingaProvider as any).getAnalystRatings(req.params.symbol.toUpperCase())
  res.json(ratings)
})

// TMX : corporate events (dividendes, splits, AGM...)
export const corporateEvents = handle(async (req, res) => {
  const events = await (tmxProvider as any).getCorporateEvents(req.params.symbol.toUpperCase())
  res.json(events)
})

// TMX : quote TSX (actions canadiennes)
export const tsxQuote = handle(async (req, res) => {
  const q = await (tmxProvider as any).getTSXQuote(req.params.symbol.toUpperCase())
  res.json(q)
})

// ETF Global : détails complets ETF
export const etfDetails = handle(async (req, res) => {
  res.json(await (etfGlobalProvider as any).getETFDetails(req.params.symbol.toUpperCase()))
})

// ETF Global : top holdings
export const etfHoldings = handle(async (req, res) => {
  const limit = req.query.limit ? +req.query.limit : 20
  res.json(await (etfGlobalProvider as any).getETFHoldings(req.params.symbol.toUpperCase(), limit))
})

// ETF Global : exposition sectorielle
export const etfSectors = handle(async (req, res) => {
  res.json(await (etfGlobalProvider as any).getETFSectorExposure(req.params.symbol.toUpperCase()))
})

// ETF Global : performance multi-périodes
export const etfPerformance = handle(async (req, res) => {
  res.json(await (etfGlobalProvider as any).getETFPerformance(req.params.symbol.toUpperCase()))
})

// ETF Global : recherche ETF par catégorie
export const etfByCategory = handle(async (req, res) => {
  const category = req.query.category as string || 'equity'
  res.json(await (etfGlobalProvider as any).getETFsByCategory(category))
})
