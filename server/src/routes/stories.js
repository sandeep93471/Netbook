import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import * as c from '../controllers/storyController.js'

const router = Router()
router.use(protect)

router.get('/', c.getStories)
router.get('/archive', c.getArchive)
router.post('/', c.addStory)
router.post('/:id/view', c.recordView)
router.delete('/:id', c.deleteStory)

export default router
