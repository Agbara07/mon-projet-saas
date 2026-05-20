import { Router } from 'express'
import { getMe, updateProfile } from '../controllers/user.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)
router.get('/me', getMe)
router.patch('/me', updateProfile)

export default router
