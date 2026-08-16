import Story from '../models/Story.js'
import User from '../models/User.js'

// GET /api/stories — active (<24h), grouped by user; private accounts only show to friends
export const getStories = async (req, res) => {
  const stories = await Story.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(100).lean()

  // Drop stories from private accounts the viewer can't see
  const vid = req.user._id.toString()
  const authorIds = [...new Set(stories.map((s) => s.user.toString()))]
  const authors = await User.find({ _id: { $in: authorIds } })
    .select('isPrivate followers friends closeFriends').lean()
  const authorMap = Object.fromEntries(authors.map((a) => [a._id.toString(), a]))

  const groups = {}
  stories.forEach((s) => {
    const uid = s.user.toString()
    const a = authorMap[uid]
    if (!a) return
    if (uid !== vid) {
      // Private account → friends only
      if (a.isPrivate && !a.friends.some((f) => f.toString() === vid)) return
      // Close-friends story → author's close list only
      if (s.closeFriendsOnly && !a.closeFriends?.some((f) => f.toString() === vid)) return
    }
    if (!groups[uid]) groups[uid] = { userId: uid, displayName: s.displayName, photoURL: s.photoURL, stories: [], allSeen: true, closeFriends: false }
    if (s.closeFriendsOnly) groups[uid].closeFriends = true
    const seen = uid === vid || s.viewedBy.some((v) => v.user?.toString() === vid)
    if (!seen) groups[uid].allSeen = false
    groups[uid].stories.push({
      id: s._id, imageURL: s.imageURL, createdAt: s.createdAt,
      seen,
      // viewer list only exposed to the story owner
      viewers: uid === vid ? s.viewedBy.map((v) => v.user?.toString()) : undefined,
      viewCount: s.viewedBy.length,
    })
  })
  // Unseen groups sort first (IG behavior)
  const list = Object.values(groups)
  list.sort((a, b) => (a.allSeen ? 1 : 0) - (b.allSeen ? 1 : 0))
  res.json({ groups: list })
}

// POST /api/stories/:id/view — record that I saw it (deduped, owner excluded)
export const recordView = async (req, res) => {
  const story = await Story.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { viewedBy: { user: req.user._id, at: Date.now() } } },
    { new: true }
  )
  if (!story) return res.status(404).json({ message: 'Not found' })
  res.json({ viewCount: story.viewedBy.length })
}

// POST /api/stories { imageURL, closeFriendsOnly } — client uploads to Cloudinary first
export const addStory = async (req, res) => {
  const story = await Story.create({
    user: req.user._id,
    displayName: req.user.displayName,
    photoURL: req.user.photoURL,
    imageURL: req.body.imageURL,
    closeFriendsOnly: !!req.body.closeFriendsOnly,
    createdAt: Date.now(),
  })
  res.status(201).json({ story })
}

// GET /api/stories/archive — ALL my stories incl. expired (highlight picker)
export const getArchive = async (req, res) => {
  const stories = await Story.find({ user: req.user._id })
    .sort({ createdAt: -1 }).limit(100).lean()
  res.json({
    stories: stories.map((s) => ({
      id: s._id, imageURL: s.imageURL, createdAt: s.createdAt,
      closeFriendsOnly: s.closeFriendsOnly, viewCount: s.viewedBy.length,
    })),
  })
}

// DELETE /api/stories/:id — owner only
export const deleteStory = async (req, res) => {
  const story = await Story.findById(req.params.id)
  if (!story) return res.status(404).json({ message: 'Not found' })
  if (story.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your story' })
  }
  await story.deleteOne()
  res.json({ deleted: true })
}
