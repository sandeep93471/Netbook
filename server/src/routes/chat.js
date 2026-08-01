import { Router } from 'express'
import { body } from 'express-validator'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/error.js'
import * as c from '../controllers/chatController.js'

const router = Router()
router.use(protect)

router.get('/conversations', c.getConversations)
router.post('/conversations', c.getOrCreateDM)
router.post('/groups', body('name').trim().notEmpty(), validate, c.createGroup)
router.patch('/conversations/:id', c.updateConversation)
router.put('/conversations/:id/members/:uid', c.addMember)
router.delete('/conversations/:id/members/:uid', c.removeMember)
router.put('/conversations/:id/admins/:uid', c.addAdmin)
router.delete('/conversations/:id/admins/:uid', c.removeAdmin)
router.get('/conversations/:id/messages', c.getMessages)
router.post('/conversations/:id/messages', body('text').trim().isLength({ min: 1, max: 500 }), validate, c.sendMessage)
router.post('/conversations/:id/read', c.markRead)
router.delete('/messages/:id', c.unsendMessage)
router.put('/messages/:id/react', c.reactMessage)

export default router
