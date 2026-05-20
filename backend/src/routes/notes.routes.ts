import { Router } from 'express'
import { getNotes, upsertNote, deleteNote } from '../controllers/notes.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/:symbol', getNotes)
router.put('/:symbol', upsertNote)
router.delete('/:id', deleteNote)

export default router
