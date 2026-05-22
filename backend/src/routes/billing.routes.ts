import express, { Router } from 'express'
import { createCheckoutSession, createPortalSession, handleWebhook, getSubscriptionInfo } from '../controllers/billing.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook)
router.use(authenticate)
router.get('/info',     getSubscriptionInfo)
router.post('/checkout', createCheckoutSession)
router.post('/portal',   createPortalSession)

export default router
