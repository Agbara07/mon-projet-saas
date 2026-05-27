import { Router } from 'express'
import { listPortfolios, createPortfolio, deletePortfolio, getPortfolioWithPrices, addHolding, removeHolding, exportPortfolio } from '../controllers/portfolio.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { planGuard, exportGuard } from '../middlewares/plan-guard.middleware'

const router = Router()
router.use(authenticate)
router.get('/', listPortfolios)
router.post('/', planGuard('portfolios'), createPortfolio)
router.get('/:id/export', exportGuard, exportPortfolio)
router.get('/:id', getPortfolioWithPrices)
router.delete('/:id', deletePortfolio)
router.post('/:id/holdings', addHolding)
router.delete('/:id/holdings/:holdingId', removeHolding)

export default router
