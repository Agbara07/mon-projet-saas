import { Router } from 'express'
import {
  quote, historical, search, screener, profile, news,
  earningsCalendar, marketOverview, technicalIndicators, providersStatus,
} from '../controllers/market.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/status',               providersStatus)
router.get('/overview',             marketOverview)
router.get('/earnings',             earningsCalendar)
router.get('/search',               search)
router.get('/screener',             screener)
router.get('/:symbol/quote',        quote)
router.get('/:symbol/historical',   historical)
router.get('/:symbol/profile',      profile)
router.get('/:symbol/news',         news)
router.get('/:symbol/technical',    technicalIndicators)

export default router
