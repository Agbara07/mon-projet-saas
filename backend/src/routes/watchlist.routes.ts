import { Router } from 'express'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../controllers/watchlist.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { planGuard } from '../middlewares/plan-guard.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getWatchlist)
router.post('/', planGuard('watchlistItems'), addToWatchlist)
router.delete('/:symbol', removeFromWatchlist)

export default router
