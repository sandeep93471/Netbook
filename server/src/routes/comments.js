import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/commentController.js'

const router = Router()
router.use(protect)

router.get('/:postId', c.getComments)
router.post('/:postId', c.addComment)
router.put('/:id/like', c.likeComment)
router.delete('/:id', c.deleteComment)

export default router
