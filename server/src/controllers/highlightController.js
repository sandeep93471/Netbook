import Highlight from '../models/Highlight.js'
import Story from '../models/Story.js'
import User from '../models/User.js'

const shape = (h) => ({
  id: h._id,
  name: h.name,
  coverImage: h.coverImage,
  items: (h.items || []).map((s) => s && s.imageURL
    ? { id: s._id, imageURL: s.imageURL, createdAt: s.createdAt, closeFriendsOnly: s.closeFriendsOnly }
    : null).filter(Boolean),
})

// GET /api/highlights/user/:userId — private profiles = friends only
export const getUserHighlights = async (req, res) => {
  const owner = await User.findById(req.params.userId).select('isPrivate friends').lean()
  if (!owner) return res.status(404).json({ message: 'User not found' })
  const vid = req.user._id.toString()
  const isSelf = owner._id.toString() === vid
  if (owner.isPrivate && !isSelf && !owner.friends.some((f) => f.toString() === vid)) {
    return res.json({ highlights: [] })
  }

  const ownerFull = await User.findById(req.params.userId).select('closeFriends').lean()
  const canSeeClose = isSelf || ownerFull?.closeFriends?.some((f) => f.toString() === vid)

  const highlights = await Highlight.find({ user: req.params.userId })
    .populate('items', 'imageURL createdAt closeFriendsOnly')
    .sort({ createdAt: 1 }).lean()

  res.json({
    highlights: highlights.map((h) => {
      const shaped = shape(h)
      // close-friends stories inside a highlight only show to author's close list
      if (!canSeeClose) shaped.items = shaped.items.filter((i) => !i.closeFriendsOnly)
      return shaped
    }),
  })
}

// POST /api/highlights { name, storyIds } — own stories only
export const createHighlight = async (req, res) => {
  const { name, storyIds = [] } = req.body
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })
  if (!storyIds.length) return res.status(400).json({ message: 'Pick at least one story' })

  const stories = await Story.find({ _id: { $in: storyIds }, user: req.user._id }).lean()
  if (!stories.length) return res.status(400).json({ message: 'No valid stories selected' })

  // Preserve the order the user picked them in
  const ordered = storyIds.filter((id) => stories.some((s) => s._id.toString() === id))
  const cover = stories.find((s) => s._id.toString() === ordered[0])?.imageURL || ''

  const h = await Highlight.create({
    user: req.user._id, name: name.trim(), coverImage: cover, items: ordered,
  })
  const populated = await h.populate('items', 'imageURL createdAt closeFriendsOnly')
  res.status(201).json({ highlight: shape(populated) })
}

// DELETE /api/highlights/:id — owner only (stories themselves are kept)
export const deleteHighlight = async (req, res) => {
  const h = await Highlight.findById(req.params.id)
  if (!h) return res.status(404).json({ message: 'Not found' })
  if (h.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your highlight' })
  }
  await h.deleteOne()
  res.json({ deleted: true })
}
