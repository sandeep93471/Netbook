import { Router } from 'express'
import { body } from 'express-validator'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/error.js'
import * as c from '../controllers/postController.js'

const router = Router()
router.use(protect)

router.get('/', c.getFeed)
router.get('/search', c.searchPosts)
router.post('/batch', c.postsByIds)
router.get('/reels', c.getReels)
router.get('/explore', c.getExplore)
router.get('/tag/:tag', c.postsByTag)
router.get('/user/:userId', c.postsByUser)
router.get('/:id', c.getPost)
router.post('/', body('text').trim().isLength({ max: 2000 }).withMessage('Post must be under 2000 chars'), validate, c.createPost)
router.patch('/:id', body('text').trim().isLength({ min: 1, max: 2000 }), validate, c.updatePost)
router.delete('/:id', c.deletePost)
router.put('/:id/reaction', c.setReaction)
router.delete('/:id/reaction', c.setReaction)
router.post('/:id/share', c.sharePost)
router.post('/:id/report', c.reportPost)

export default router
