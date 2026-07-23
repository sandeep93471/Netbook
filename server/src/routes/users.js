import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/userController.js'

const router = Router()
router.use(protect)

router.get('/search', c.searchUsers)
router.get('/suggested', c.suggestedUsers)
router.get('/basic', c.basicUsers)
router.get('/status/:id', c.userStatus)
router.patch('/me', c.updateMe)
router.put('/me/saved/:postId', c.toggleSaved)
router.post('/me/search-history', c.recordSearch)
router.delete('/me/search-history/:term', c.removeSearch)
router.put('/me/fcm', c.addFcmToken)
router.put('/me/close-friends/:id', c.toggleCloseFriend)

router.get('/:id', c.getUser)

export default router
