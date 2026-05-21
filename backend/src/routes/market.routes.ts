import { Router } from 'express'
import {
  quote, historical, search, screener, profile, news,
  earningsCalendar, marketOverview, technicalIndicators, providersStatus,
  analystRatings, corporateEvents, tsxQuote,
  etfDetails, etfHoldings, etfSectors, etfPerformance, etfByCategory,
  brvmQuotes, brvmQuote, brvmHistorical, brvmIndices,
  brvmSectors, brvmCountries, brvmMarket, brvmCompanies,
  brvmLiquidity, brvmStockLiquidity,
  brvmDividends, brvmStockDividend,
  brvmCommodities, brvmStockCommodity,
  brvmAfricaComparison, brvmMacro,
  brvmGovernance, brvmTransactionCost,
  brvmCacheStatus, brvmRefresh,
} from '../controllers/market.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// ── /refresh : pas de JWT — protégé uniquement par CRON_SECRET header ─
router.post('/brvm/refresh', brvmRefresh)

// ── Toutes les autres routes requièrent un JWT ─────────────
router.use(authenticate)

// ── Core ───────────────────────────────────────────────────
router.get('/status',    providersStatus)
router.get('/overview',  marketOverview)
router.get('/earnings',  earningsCalendar)
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

export default router
