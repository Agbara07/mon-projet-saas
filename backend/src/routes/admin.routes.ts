import { Router } from 'express'
import { listUsers, listOrganizations } from '../controllers/admin.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate, requireAdmin)
router.get('/users', listUsers)
router.get('/organizations', listOrganizations)

export default router
