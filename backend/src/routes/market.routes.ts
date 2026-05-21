import { Router } from 'express'
import {
  quote, historical, search, screener, profile, news,
  earningsCalendar, marketOverview, technicalIndicators, providersStatus,
  analystRatings, corporateEvents, tsxQuote,
  etfDetails, etfHoldings, etfSectors, etfPerformance, etfByCategory,
} from '../controllers/market.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

// ── Core endpoints ─────────────────────────────────────────
router.get('/status',                providersStatus)
router.get('/overview',              marketOverview)
router.get('/earnings',              earningsCalendar)
router.get('/search',                search)
router.get('/screener',              screener)

// ── ETF Global endpoints ───────────────────────────────────
router.get('/etf',                   etfByCategory)
router.get('/etf/:symbol',           etfDetails)
router.get('/etf/:symbol/holdings',  etfHoldings)
router.get('/etf/:symbol/sectors',   etfSectors)
router.get('/etf/:symbol/performance', etfPerformance)

// ── Par symbole ────────────────────────────────────────────
router.get('/:symbol/quote',         quote)
router.get('/:symbol/historical',    historical)
router.get('/:symbol/profile',       profile)
router.get('/:symbol/news',          news)
router.get('/:symbol/technical',     technicalIndicators)
router.get('/:symbol/ratings',       analystRatings)       // Benzinga analyst ratings
router.get('/:symbol/events',        corporateEvents)      // TMX corporate events
router.get('/:symbol/tsx',           tsxQuote)             // TMX quote CAD

export default router
