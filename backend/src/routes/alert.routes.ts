import { Router } from 'express'
import { listAlerts, createAlert, deleteAlert, toggleAlert } from '../controllers/alert.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', listAlerts)
router.post('/', createAlert)
router.delete('/:id', deleteAlert)
router.patch('/:id/toggle', toggleAlert)

export default router
