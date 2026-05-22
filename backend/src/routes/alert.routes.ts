import { Router } from 'express'
import { listAlerts, createAlert, deleteAlert, toggleAlert } from '../controllers/alert.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { planGuard } from '../middlewares/plan-guard.middleware'

const router = Router()
router.use(authenticate)
router.get('/', listAlerts)
router.post('/', planGuard('alerts'), createAlert)
router.delete('/:id', deleteAlert)
router.patch('/:id/toggle', toggleAlert)

export default router
