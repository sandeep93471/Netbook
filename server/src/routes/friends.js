import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/friendController.js'

const router = Router()
router.use(protect)

router.get('/', c.getFriends)
router.get('/status/:userId', c.friendStatus)
router.post('/request/:userId', c.sendRequest)
router.delete('/request/:requestId', c.cancelRequest)
router.post('/accept/:requestId', c.acceptRequest)
router.delete('/:userId', c.unfriend)

export default router
