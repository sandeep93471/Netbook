import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/highlightController.js'

const router = Router()
router.use(protect)

router.get('/user/:userId', c.getUserHighlights)
router.post('/', c.createHighlight)
router.delete('/:id', c.deleteHighlight)

export default router
