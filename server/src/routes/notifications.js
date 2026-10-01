import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/notificationController.js'
import { pushEnabled, pushPublicKey } from '../utils/push.js'

const router = Router()

// Public VAPID key — client needs it to subscribe; {enabled:false} when unset
router.get('/push-key', (req, res) => {
  res.json({ enabled: pushEnabled(), publicKey: pushPublicKey() })
})

router.use(protect)

router.get('/', c.getNotifications)
router.put('/read-all', c.markAllRead)
router.put('/:id/read', c.markRead)

export default router
