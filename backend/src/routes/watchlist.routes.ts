import { Router } from 'express'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../controllers/watchlist.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getWatchlist)
router.post('/', addToWatchlist)
router.delete('/:symbol', removeFromWatchlist)

export default router
