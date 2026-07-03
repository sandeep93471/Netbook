import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import Report from '../models/Report.js'
import { emitToUser } from '../socket/index.js'

const VALID_REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry']
const PAGE_SIZE = 10

// Create a notification + push it over socket if the recipient is online
const notify = async ({ recipientId, sender, type, postId, postText }) => {
  if (recipientId.toString() === sender._id.toString()) return
  const n = await Notification.create({
    recipient: recipientId, sender: sender._id,
    senderName: sender.displayName, senderPhoto: sender.photoURL,
    type, postId, postText: postText?.slice(0, 80),
  })
  emitToUser(recipientId, 'notification:new', n)
}

// Parse #tags, @mentions (resolves names to uids), searchTerms from text
const parsePostText = async (text) => {
  const hashtags = [...new Set([...text.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase()))]
  const mentionNames = [...new Set([...text.matchAll(/@([\w.]+)/g)].map((m) => m[1].toLowerCase()))]
  const searchTerms = [...new Set(text.toLowerCase().split(/[^\w#@]+/).filter((w) => w.length > 1))]

  const mentionMap = {}
  if (mentionNames.length) {
    const users = await User.find({ searchName: { $in: mentionNames } }).select('_id searchName')
    users.forEach((u) => { mentionMap[u.searchName] = u._id.toString() })
  }
  return { hashtags, mentions: Object.values(mentionMap), mentionMap, searchTerms }
}

// flattenMaps — Mongoose Maps serialize as {} without it (reactions, mentionMap)
const shapePost = (p) => ({ ...p.toObject({ flattenMaps: true }), id: p._id, userId: p.user?.toString() })

// Privacy filter — private accounts AND per-post audience (public/followers/onlyme)
const filterVisiblePosts = async (posts, viewer) => {
  const vid = viewer._id.toString()
  const authorIds = [...new Set(posts.map((p) => p.user?.toString()).filter(Boolean))]
  const authors = await User.find({ _id: { $in: authorIds } })
    .select('isPrivate followers friends closeFriends').lean()
  const authorMap = Object.fromEntries(authors.map((a) => [a._id.toString(), a]))

  const allowed = (p) => {
    const aid = p.user?.toString()
    const a = authorMap[aid]
    if (!a) return false
    if (aid === vid) return true
    // Per-post audience
    if (p.visibility === 'onlyme') return false
    if (p.visibility === 'followers' && !a.friends.some((f) => f.toString() === vid)) return false
    if (p.visibility === 'closefriends' && !a.closeFriends?.some((f) => f.toString() === vid)) return false
    // Account-level privacy — private = friends only
    if (a.isPrivate && !a.friends.some((f) => f.toString() === vid)) return false
    return true
  }
  return posts.filter(allowed)
}

// GET /api/posts?cursor=<createdAt> — feed, newest first, paginated
export const getFeed = async (req, res) => {
  const cursor = req.query.cursor ? Number(req.query.cursor) : null
  const filter = { hidden: { $ne: true } }
  if (cursor) filter.createdAt = { $lt: new Date(cursor) }
  let posts = await Post.find(filter)
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE + 1)
    .lean()
  posts = await filterVisiblePosts(posts, req.user)
  const hasMore = posts.length > PAGE_SIZE
  const page = posts.slice(0, PAGE_SIZE)
  res.json({
    posts: page.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })),
    hasMore,
    cursor: hasMore ? new Date(page[page.length - 1].createdAt).getTime() : null,
  })
}

// GET /api/posts/reels — video posts, newest first (privacy-filtered)
export const getReels = async (req, res) => {
  let posts = await Post.find({ videoURL: { $ne: '' }, hidden: { $ne: true } })
    .sort({ createdAt: -1 }).limit(50).lean()
  posts = await filterVisiblePosts(posts, req.user)
  res.json({ posts: posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}

// GET /api/posts/explore — media posts ranked by engagement (likes+comments+shares)
export const getExplore = async (req, res) => {
  let posts = await Post.find({
    hidden: { $ne: true },
    $or: [{ imageURL: { $ne: '' } }, { videoURL: { $ne: '' } }],
  }).sort({ createdAt: -1 }).limit(100).lean()
  posts = await filterVisiblePosts(posts, req.user)
  posts.sort((a, b) =>
    (b.likes.length + b.commentCount + b.shareCount) - (a.likes.length + a.commentCount + a.shareCount))
  res.json({ posts: posts.slice(0, 60).map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}

// POST /api/posts — atomic: parse + create + mention notifications in one request
export const createPost = async (req, res) => {
  const { text, imageURL = '', videoURL = '', background = null, visibility = 'public' } = req.body
  const parsed = await parsePostText(text)
  const post = await Post.create({
    text, imageURL, background, videoURL,
    visibility: ['public', 'followers', 'closefriends', 'onlyme'].includes(visibility) ? visibility : 'public',
    user: req.user._id,
    displayName: req.user.displayName,
    photoURL: req.user.photoURL,
    ...parsed,
  })
  await Promise.all(parsed.mentions.map((uid) =>
    notify({ recipientId: uid, sender: req.user, type: 'mention', postId: post._id, postText: text })
  ))
  res.status(201).json({ post: shapePost(post) })
}

// GET /api/posts/:id
export const getPost = async (req, res) => {
  const post = await Post.findById(req.params.id)
  if (!post) return res.status(404).json({ message: 'Post not found' })
  res.json({ post: shapePost(post) })
}

// PATCH /api/posts/:id — owner only
export const updatePost = async (req, res) => {
  const post = await Post.findById(req.params.id)
  if (!post) return res.status(404).json({ message: 'Post not found' })
  if (post.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your post' })
  }
  const parsed = await parsePostText(req.body.text)
  post.text = req.body.text
  Object.assign(post, parsed)
  await post.save()
  res.json({ post: shapePost(post) })
}

// DELETE /api/posts/:id — owner only; cascades comments atomically
export const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id)
  if (!post) return res.status(404).json({ message: 'Post not found' })
  if (post.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your post' })
  }
  await Promise.all([
    post.deleteOne(),
    Comment.deleteMany({ post: post._id }),
    Notification.deleteMany({ postId: post._id }),
    Report.deleteMany({ post: post._id }),
  ])
  res.json({ deleted: true })
}

// PUT /api/posts/:id/reaction { reaction } — set; DELETE removes
export const setReaction = async (req, res) => {
  const post = await Post.findById(req.params.id)
  if (!post) return res.status(404).json({ message: 'Post not found' })
  const uid = req.user._id.toString()

  if (req.method === 'DELETE') {
    post.reactions.delete(uid)
    post.likes = post.likes.filter((l) => l.toString() !== uid)
  } else {
    const { reaction } = req.body
    if (!VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ message: 'Invalid reaction' })
    }
    const had = post.reactions.get(uid)
    post.reactions.set(uid, reaction)
    post.likes = reaction === 'like'
      ? [...new Set([...post.likes.map(String), uid])]
      : post.likes.filter((l) => l.toString() !== uid)
    if (!had) {
      await notify({ recipientId: post.user, sender: req.user, type: 'like', postId: post._id, postText: post.text })
    }
  }
  await post.save()
  res.json({ post: shapePost(post) })
}

// POST /api/posts/:id/share { caption }
export const sharePost = async (req, res) => {
  const original = await Post.findById(req.params.id)
  if (!original || original.hidden) return res.status(404).json({ message: 'Post not found' })
  const caption = req.body.caption || ''

  const [shared] = await Promise.all([
    Post.create({
      text: caption || `Shared ${original.displayName}'s post`,
      user: req.user._id,
      displayName: req.user.displayName,
      photoURL: req.user.photoURL,
      sharedFrom: {
        id: original._id,
        displayName: original.displayName,
        photoURL: original.photoURL,
        text: original.text,
        imageURL: original.imageURL,
        createdAt: original.createdAt,
      },
    }),
    Post.findByIdAndUpdate(original._id, { $inc: { shareCount: 1 } }),
    notify({ recipientId: original.user, sender: req.user, type: 'share', postId: original._id, postText: original.text }),
  ])
  res.status(201).json({ post: shapePost(shared) })
}

// POST /api/posts/:id/report { reason } — auto-hides at 3 reports
export const reportPost = async (req, res) => {
  const post = await Post.findById(req.params.id)
  if (!post) return res.status(404).json({ message: 'Post not found' })
  await Report.create({ post: post._id, reportedBy: req.user._id, reason: req.body.reason })
  post.reportCount += 1
  if (post.reportCount >= 3) post.hidden = true
  await post.save()
  res.json({ reportCount: post.reportCount, hidden: post.hidden })
}

// GET /api/posts/tag/:tag
export const postsByTag = async (req, res) => {
  const posts = await Post.find({ hashtags: req.params.tag.toLowerCase(), hidden: { $ne: true } })
    .sort({ createdAt: -1 }).limit(50).lean()
  res.json({ posts: posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}

// GET /api/posts/search?q=word — word-level match on searchTerms
export const searchPosts = async (req, res) => {
  const posts = await Post.find({
    searchTerms: req.query.q.toLowerCase(),
    hidden: { $ne: true },
  }).sort({ createdAt: -1 }).limit(50).lean()
  res.json({ posts: posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}

// GET /api/posts/user/:userId — private accounts only show to followers/friends
export const postsByUser = async (req, res) => {
  const author = await User.findById(req.params.userId).select('isPrivate followers friends')
  if (!author) return res.status(404).json({ message: 'User not found' })
  const vid = req.user._id.toString()
  const canView = author._id.toString() === vid || !author.isPrivate
    || author.friends.some((f) => f.toString() === vid)
  if (!canView) return res.status(403).json({ message: 'This account is private', private: true })

  let posts = await Post.find({ user: req.params.userId }).sort({ createdAt: -1 }).limit(50).lean()
  posts = await filterVisiblePosts(posts, req.user) // audience selector still applies
  res.json({ posts: posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}

// POST /api/posts/batch { ids } — Saved page
export const postsByIds = async (req, res) => {
  const posts = await Post.find({ _id: { $in: req.body.ids || [] } }).lean()
  res.json({ posts: posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })) })
}
