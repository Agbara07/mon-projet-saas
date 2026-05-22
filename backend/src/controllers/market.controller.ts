import { Request, Response } from 'express'
import { marketRouter, benzingaProvider, tmxProvider, etfGlobalProvider, brvmProvider, fmpProvider } from '../services/market/market-router'
import { ScreenerFilters } from '../services/market/types'
import {
  getAllLiquidityScores, computeLiquidityScore,
  computeDividendData, getAllGovernanceScores, computeGovernanceScore,
  getAfricanMarketsComparison, getUEMOAMacroDashboard,
  computeCommodityCorrelation, COMMODITY_MAP,
  simulateTransactionCost,
} from '../services/market/providers/brvm-tools.provider'
import {
  getCacheStatus, refreshBRVMData,
} from '../services/brvm-cron.service'

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

// ── Cron & cache BRVM ───────────────────────────────────────

// GET /market/brvm/cache-status — état du cache DB (JWT requis)
export const brvmCacheStatus = handle(async (_req, res) => {
  res.json(await getCacheStatus())
})

// POST /market/brvm/refresh — déclenché par GitHub Actions (CRON_SECRET)
export const brvmRefresh = async (req: Request, res: Response) => {
  const received = ((req.headers['x-cron-secret'] as string) ?? '').trim()
  const expected = (process.env.CRON_SECRET ?? '').trim()
  if (!expected || received !== expected) {
    return res.status(401).json({ message: 'CRON_SECRET invalide ou manquant' })
  }
  try {
    const result = await refreshBRVMData()
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ message: e.message })
  }
}

// ── Outils d'analyse BRVM ───────────────────────────────────

// Outil 1 : Liquidité — tous les titres
export const brvmLiquidity = handle(async (_req, res) => {
  res.json(getAllLiquidityScores())
})

// Outil 1 : Liquidité — titre individuel
export const brvmStockLiquidity = handle(async (req, res) => {
  const sym   = req.params.symbol.toUpperCase()
  const quote = await brvmProvider.getQuote(sym).catch(() => null)
  res.json(computeLiquidityScore(sym, quote?.price ?? 0))
})

// Outil 2 : Dividendes — screener complet (fonctionne même sans prix live)
export const brvmDividends = handle(async (_req, res) => {
  const { BRVM_COMPANIES } = await import('../services/market/providers/brvm.provider')
  // Essayer d'obtenir les prix live, sinon continuer avec prix=0
  let priceMap = new Map<string, number>()
  try {
    const quotes = await (brvmProvider as any).getBRVMQuotes()
    priceMap = new Map(quotes.filter((q: any) => q.price > 0).map((q: any) => [q.symbol, q.price]))
  } catch { /* brvm.org inaccessible — dividendes sans rendement calculé */ }
  const result = Object.keys(BRVM_COMPANIES).map(sym =>
    computeDividendData(sym, priceMap.get(sym) ?? 0)
  ).sort((a, b) => b.lastDividend - a.lastDividend)
  res.json(result)
})

// Outil 2 : Dividendes — titre individuel
export const brvmStockDividend = handle(async (req, res) => {
  const sym   = req.params.symbol.toUpperCase()
  const quote = await brvmProvider.getQuote(sym).catch(() => null)
  res.json(computeDividendData(sym, quote?.price ?? 0))
})

// Outil 3 : Corrélation matières premières — tous les titres liés
export const brvmCommodities = handle(async (_req, res) => {
  const symbols  = Object.keys(COMMODITY_MAP)
  const results  = await Promise.allSettled(
    symbols.map(async sym => {
      const hist = await brvmProvider.getHistorical(sym, '3mo').catch(() => [])
      return computeCommodityCorrelation(sym, hist)
    })
  )
  res.json(results.filter(r => r.status === 'fulfilled').map((r: any) => r.value))
})

// Outil 3 : Corrélation matières premières — titre individuel
export const brvmStockCommodity = handle(async (req, res) => {
  const sym  = req.params.symbol.toUpperCase()
  const hist = await brvmProvider.getHistorical(sym, '3mo').catch(() => [])
  res.json(await computeCommodityCorrelation(sym, hist))
})

// Outil 4 : Comparateur bourses africaines
export const brvmAfricaComparison = handle(async (_req, res) => {
  res.json(getAfricanMarketsComparison())
})

// Outil 5 : Tableau de bord macro UEMOA
export const brvmMacro = handle(async (_req, res) => {
  res.json(getUEMOAMacroDashboard())
})

// Outil 6 : Scores de gouvernance — tous les titres
export const brvmGovernance = handle(async (_req, res) => {
  res.json(getAllGovernanceScores())
})

// Outil 7 : Simulateur coût de transaction
export const brvmTransactionCost = handle(async (req, res) => {
  const input = req.body
  if (!input?.amount || !input?.type || !input?.country) {
    return res.status(400).json({ message: 'Champs requis: amount, type, country' })
  }
  res.json(simulateTransactionCost(input))
})

// ETF Global : recherche ETF par catégorie
export const etfByCategory = handle(async (req, res) => {
  const category = req.query.category as string || 'equity'
  res.json(await (etfGlobalProvider as any).getETFsByCategory(category))
})

// ── BRVM — Bourse Régionale des Valeurs Mobilières ─────────

// Toutes les cotations BRVM
export const brvmQuotes = handle(async (_req, res) => {
  res.json(await (brvmProvider as any).getBRVMQuotes())
})

// Cotation d'un titre BRVM
export const brvmQuote = handle(async (req, res) => {
  res.json(await brvmProvider.getQuote(req.params.symbol.toUpperCase()))
})

// Historique d'un titre BRVM
export const brvmHistorical = handle(async (req, res) => {
  const period = (req.query.period as string) || '1mo'
  res.json(await brvmProvider.getHistorical(req.params.symbol.toUpperCase(), period))
})

// Indices BRVM Composite et BRVM 10
export const brvmIndices = handle(async (_req, res) => {
  res.json(await (brvmProvider as any).getBRVMIndices())
})

// Performance par secteur UEMOA
export const brvmSectors = handle(async (_req, res) => {
  res.json(await (brvmProvider as any).getBRVMSectors())
})

// Répartition géographique (8 pays UEMOA)
export const brvmCountries = handle(async (_req, res) => {
  res.json(await (brvmProvider as any).getBRVMCountries())
})

// Vue marché complète BRVM
export const brvmMarket = handle(async (_req, res) => {
  res.json(await (brvmProvider as any).getBRVMMarketStats())
})

// Liste des sociétés cotées BRVM
export const brvmCompanies = handle(async (_req, res) => {
  res.json((brvmProvider as any).getBRVMCompanies())
})

/* ── FMP — Données fondamentales ────────────────────────────── */

// Bilans complets : income + balance + cash flow + estimations + DCF
export const fundamentals = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const limit  = Math.min(Number(req.query.limit) || 10, 30)
  const data   = await (fmpProvider as any).getFundamentals(symbol, limit)
  res.json(data)
})

// Estimations analystes (EPS forward, revenus forward, consensus)
export const analystEstimates = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const data   = await (fmpProvider as any).getAnalystEstimates(symbol)
  res.json(data)
})

// Valorisation DCF (fair value par action + % upside)
export const dcfValuation = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const data   = await (fmpProvider as any).getDCF(symbol)
  res.json(data)
})

// Compte de résultats seul (N dernières années)
export const incomeStatements = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const limit  = Math.min(Number(req.query.limit) || 10, 30)
  const data   = await (fmpProvider as any).getIncomeStatements(symbol, limit)
  res.json(data)
})

// Bilans seuls
export const balanceSheets = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const limit  = Math.min(Number(req.query.limit) || 10, 30)
  const data   = await (fmpProvider as any).getBalanceSheets(symbol, limit)
  res.json(data)
})

// Cash flows seuls
export const cashFlows = handle(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const limit  = Math.min(Number(req.query.limit) || 10, 30)
  const data   = await (fmpProvider as any).getCashFlows(symbol, limit)
  res.json(data)
})
