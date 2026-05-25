import { Router } from 'express'
import { createCheckoutSession, createPortalSession, getSubscriptionInfo } from '../controllers/billing.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// /webhook est monté directement dans index.ts AVANT express.json() pour recevoir le body raw.
router.use(authenticate)
router.get('/info',     getSubscriptionInfo)
router.post('/checkout', createCheckoutSession)
router.post('/portal',   createPortalSession)

export default router
