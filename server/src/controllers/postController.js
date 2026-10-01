import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import Report from '../models/Report.js'
import { notify } from '../utils/notify.js'
import { cache } from '../utils/cache.js'
import { rankPosts, FEED_POOL_SIZE } from '../utils/rankFeed.js'
import { feedRankDuration } from '../utils/metrics.js'
import { embedText, cosine } from '../utils/embeddings.js'

const VALID_REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry']
const PAGE_SIZE = 10

// Any post write can change what's in the cached pools — drop them.
// Prefix delete; short TTLs cover everything else.
const invalidatePostCaches = (post) =>
  Promise.all([
    cache.del('feed:pool'),
    cache.del('explore:pool'),
    ...(post?.hashtags || []).map((t) => cache.del(`tag:${t}`)),
  ]).catch(() => {})

// Fire-and-forget: embed post text for semantic search. Never blocks writes.
const embedPost = (post) => {
  if (!post.text) return
  embedText(post.text)
    .then((vec) => vec && Post.updateOne({ _id: post._id }, { embedding: vec }))
    .catch(() => {})
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

// Privacy filter — private accounts AND per-post audience (public/followers/onlyme).
// Author privacy state is hot-read on every feed request → cache-aside per
// author (15s). Invalidated on any relationship/privacy write; TTL bounds
// worst-case staleness either way.
const authorPrivacy = (id) => cache.wrap(`author:${id}`, 15, () =>
  User.findById(id).select('isPrivate followers friends closeFriends').lean()
)
export const bustAuthorCache = (id) => cache.del(`author:${id}`)

const filterVisiblePosts = async (posts, viewer) => {
  const vid = viewer._id.toString()
  const authorIds = [...new Set(posts.map((p) => p.user?.toString()).filter(Boolean))]
  const authors = await Promise.all(authorIds.map(authorPrivacy))
  const authorMap = Object.fromEntries(authors.filter(Boolean).map((a) => [a._id.toString(), a]))

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

// GET /api/posts — two modes:
//   ranked (default): cursor is opaque "r:<offset>:<bucket>" — we score the
//     latest FEED_POOL_SIZE posts against the viewer and paginate the pool.
//     Bucket anchors the pool to a 15s window so pages are stable and the
//     shared candidate query stays cacheable.
//   tail: when the pool is exhausted we hand back "t:<createdAt>" and paging
//     continues chronologically forever. Plain numeric cursors (old clients)
//     are treated as timestamps too — backward compatible.
const BUCKET_MS = 15_000

const rankedPage = async (cursor, viewer) => {
  const [, offRaw, bucketRaw] = cursor?.split(':') || []
  const offset = Number(offRaw) || 0
  const bucket = Number(bucketRaw) || Math.floor(Date.now() / BUCKET_MS)

  const end = feedRankDuration.startTimer()
  const pool = await cache.wrap(`feed:pool:${bucket}`, 15, () =>
    Post.find({ hidden: { $ne: true } }).sort({ createdAt: -1 }).limit(FEED_POOL_SIZE).lean()
  )
  const visible = await filterVisiblePosts(pool, viewer)
  const ranked = rankPosts(visible, viewer)
  end()

  const page = ranked.slice(offset, offset + PAGE_SIZE)
  if (offset + PAGE_SIZE < ranked.length) {
    return { posts: page, hasMore: true, cursor: `r:${offset + PAGE_SIZE}:${bucket}` }
  }
  // Pool exhausted — continue chronologically from the oldest candidate
  const oldest = pool[pool.length - 1]?.createdAt
  const moreOld = pool.length === FEED_POOL_SIZE
  return {
    posts: page,
    hasMore: moreOld,
    cursor: moreOld ? `t:${new Date(oldest).getTime()}` : null,
  }
}

const tailPage = async (createdAtMs, viewer) => {
  const posts = await Post.find({ hidden: { $ne: true }, createdAt: { $lt: new Date(createdAtMs) } })
    .sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).lean()
  const visible = (await filterVisiblePosts(posts, viewer)).slice(0, PAGE_SIZE)
  const hasMore = posts.length > PAGE_SIZE
  return {
    posts: visible,
    hasMore,
    cursor: hasMore ? `t:${new Date(visible[visible.length - 1].createdAt).getTime()}` : null,
  }
}

export const getFeed = async (req, res) => {
  const cursor = req.query.cursor || null
  const ranked = !cursor || cursor.startsWith('r:')
  const result = ranked
    ? await rankedPage(cursor, req.user)
    : await tailPage(Number(cursor.replace('t:', '')), req.user)
  res.json({
    posts: result.posts.map((p) => ({ ...p, id: p._id, userId: p.user?.toString() })),
    hasMore: result.hasMore,
    cursor: result.cursor,
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
  // Raw pool is viewer-independent → shareable cache; privacy filter still runs per-request
  let posts = await cache.wrap('explore:pool', 30, () =>
    Post.find({
      hidden: { $ne: true },
      $or: [{ imageURL: { $ne: '' } }, { videoURL: { $ne: '' } }],
    }).sort({ createdAt: -1 }).limit(100).lean()
  )
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
  embedPost(post)
  invalidatePostCaches(post)
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
  if (req.body.text !== undefined) {
    const parsed = await parsePostText(req.body.text)
    post.text = req.body.text
    Object.assign(post, parsed)
  }
  // Audience can be changed after posting — FB-style flexibility
  if (req.body.visibility !== undefined) {
    if (!['public', 'followers', 'closefriends', 'onlyme'].includes(req.body.visibility)) {
      return res.status(400).json({ message: 'Invalid audience' })
    }
    post.visibility = req.body.visibility
  }
  await post.save()
  embedPost(post) // text may have changed — re-embed
  invalidatePostCaches(post)
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
    invalidatePostCaches(post),
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
  const tag = req.params.tag.toLowerCase()
  const posts = await cache.wrap(`tag:${tag}`, 20, () =>
    Post.find({ hashtags: tag, hidden: { $ne: true } }).sort({ createdAt: -1 }).limit(50).lean()
  )
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

// GET /api/posts/semantic?q=phrase — meaning-level search over post
// embeddings. Atlas $vectorSearch when ATLAS_VECTOR_INDEX is configured,
// otherwise cosine similarity over the recent pool in-process — same
// results, just done by hand. Embeddings unavailable → keyword fallback
// so the UI never dead-ends.
export const searchPostsSemantic = async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json({ posts: [], semantic: true })
  const qvec = await embedText(q)
  if (!qvec) return searchPosts(req, res) // model off/failed → keyword results

  let candidates = null
  if (process.env.ATLAS_VECTOR_INDEX) {
    try {
      candidates = await Post.aggregate([
        {
          $vectorSearch: {
            index: process.env.ATLAS_VECTOR_INDEX,
            path: 'embedding',
            queryVector: qvec,
            numCandidates: 200,
            limit: 50,
          },
        },
        { $addFields: { _score: { $meta: 'vectorSearchScore' } } },
        { $match: { hidden: { $ne: true } } },
      ])
    } catch {
      candidates = null // index missing or not on Atlas → in-app path below
    }
  }
  if (!candidates) {
    const pool = await Post.find({ hidden: { $ne: true }, embedding: { $exists: true, $ne: [] } })
      .select('+embedding').sort({ createdAt: -1 }).limit(500).lean()
    candidates = pool
      .map((p) => ({ ...p, _score: cosine(qvec, p.embedding) }))
      .filter((p) => p._score >= 0.25) // below this it's noise, not a match
      .sort((a, b) => b._score - a._score)
      .slice(0, 40)
  }
  const visible = await filterVisiblePosts(candidates, req.user)
  res.json({
    semantic: true,
    posts: visible.slice(0, 30).map(({ embedding, _score, ...p }) => ({
      ...p, id: p._id, userId: p.user?.toString(),
    })),
  })
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
