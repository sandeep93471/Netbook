import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/notificationController.js'

const router = Router()
router.use(protect)

router.get('/', c.getNotifications)
router.put('/read-all', c.markAllRead)
router.put('/:id/read', c.markRead)

export default router
