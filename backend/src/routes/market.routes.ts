import { Router } from 'express'
import {
  quote, historical, search, screener, profile, news,
  earningsCalendar, marketOverview, technicalIndicators, providersStatus,
  analystRatings, corporateEvents, tsxQuote,
  fundamentals, analystEstimates, dcfValuation,
  incomeStatements, balanceSheets, cashFlows,
  etfDetails, etfHoldings, etfSectors, etfPerformance, etfByCategory,
  brvmQuotes, brvmQuote, brvmHistorical, brvmIndices,
  brvmSectors, brvmCountries, brvmMarket, brvmCompanies,
  brvmLiquidity, brvmStockLiquidity,
  brvmDividends, brvmStockDividend,
  brvmCommodities, brvmStockCommodity,
  brvmAfricaComparison, brvmMacro,
  brvmGovernance, brvmTransactionCost,
  brvmCacheStatus, brvmRefresh, brvmBackfill,
  macroUS, macroUEMOA,
  publicTicker,
} from '../controllers/market.controller'
import {
  euronextOverview, euronextPalmares, euronextStocks,
  euronextIndices, euronextForex, euronextCommodities,
  insiderTransactions,
} from '../controllers/euronext.controller'
import { authenticate } from '../middlewares/auth.middleware'
import rateLimit from 'express-rate-limit'

const router = Router()

// ── Routes publiques (pas de JWT) ─────────────────────────
const publicLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false })
router.get('/public/ticker',  publicLimiter, publicTicker)
// Données de marché publiques — pas user-specific, accessibles sans JWT
router.get('/overview',       publicLimiter, marketOverview)
router.get('/earnings',       publicLimiter, earningsCalendar)
router.get('/macro/us',       publicLimiter, macroUS)
router.get('/macro/uemoa',    publicLimiter, macroUEMOA)
router.post('/brvm/refresh',  brvmRefresh)
router.post('/brvm/backfill', brvmBackfill)

// ── Euronext — données publiques ──────────────────────────
// IMPORTANT : déclarer /euronext/* avant router.use(authenticate)
// pour que la page /euronext soit accessible sans JWT
router.get('/euronext',                  publicLimiter, euronextOverview)
router.get('/euronext/palmares',         publicLimiter, euronextPalmares)
router.get('/euronext/stocks',           publicLimiter, euronextStocks)
router.get('/euronext/indices',          publicLimiter, euronextIndices)
router.get('/euronext/forex',            publicLimiter, euronextForex)
router.get('/euronext/commodities',      publicLimiter, euronextCommodities)

// ── Toutes les autres routes requièrent un JWT ─────────────
router.use(authenticate)

// ── Core ───────────────────────────────────────────────────
router.get('/status',    providersStatus)
router.get('/search',    search)
router.get('/screener',  screener)

// ── ETF Global ─────────────────────────────────────────────
router.get('/etf',                       etfByCategory)
router.get('/etf/:symbol',               etfDetails)
router.get('/etf/:symbol/holdings',      etfHoldings)
router.get('/etf/:symbol/sectors',       etfSectors)
router.get('/etf/:symbol/performance',   etfPerformance)

// ── BRVM — exact routes AVANT les routes paramétriques ────
// IMPORTANT: l'ordre est critique — Express matche dans l'ordre de déclaration.
// /brvm/tools/* et /brvm/cache-status doivent être déclarés avant /brvm/:symbol/*
// pour éviter que "tools" soit interprété comme un :symbol.

router.get('/brvm/cache-status',         brvmCacheStatus)

// Cotations & marché (routes exactes)
router.get('/brvm',                      brvmQuotes)
router.get('/brvm/indices',              brvmIndices)
router.get('/brvm/sectors',              brvmSectors)
router.get('/brvm/countries',            brvmCountries)
router.get('/brvm/market',               brvmMarket)
router.get('/brvm/companies',            brvmCompanies)

// Outils d'analyse (routes exactes — AVANT /brvm/:symbol/*)
router.get('/brvm/tools/liquidity',      brvmLiquidity)
router.get('/brvm/tools/dividends',      brvmDividends)
router.get('/brvm/tools/commodities',    brvmCommodities)
router.get('/brvm/tools/africa',         brvmAfricaComparison)
router.get('/brvm/tools/macro',          brvmMacro)
router.get('/brvm/tools/governance',     brvmGovernance)
router.post('/brvm/tools/cost',          brvmTransactionCost)

// Routes paramétriques (après toutes les routes exactes)
router.get('/brvm/:symbol/quote',        brvmQuote)
router.get('/brvm/:symbol/historical',   brvmHistorical)
router.get('/brvm/:symbol/liquidity',    brvmStockLiquidity)
router.get('/brvm/:symbol/dividend',     brvmStockDividend)
router.get('/brvm/:symbol/commodity',    brvmStockCommodity)

// ── Par symbole (marchés globaux) ──────────────────────────
router.get('/:symbol/quote',             quote)
router.get('/:symbol/historical',        historical)
router.get('/:symbol/profile',           profile)
router.get('/:symbol/news',              news)
router.get('/:symbol/technical',         technicalIndicators)
router.get('/:symbol/ratings',           analystRatings)
router.get('/:symbol/events',            corporateEvents)
router.get('/:symbol/tsx',               tsxQuote)

// ── FMP — Données fondamentales ────────────────────────────────
router.get('/:symbol/fundamentals',      fundamentals)       // bilans complets 10 ans + estimations + DCF
router.get('/:symbol/estimates',         analystEstimates)   // estimations EPS/revenus forward
router.get('/:symbol/dcf',               dcfValuation)       // fair value DCF + upside
router.get('/:symbol/income-statements', incomeStatements)   // compte de résultats seul
router.get('/:symbol/balance-sheets',    balanceSheets)      // bilans seuls
router.get('/:symbol/cash-flows',        cashFlows)          // cash flows seuls
router.get('/:symbol/insider',           insiderTransactions) // transactions dirigeants (FMP)

export default router
