import Comment from '../models/Comment.js'
import Post from '../models/Post.js'
import Notification from '../models/Notification.js'
import { emitToUser } from '../socket/index.js'

const shapeComment = (c) => ({ ...c.toObject(), id: c._id, userId: c.user?.toString() })

// GET /api/comments/:postId — all comments for a post (flat; client nests replies)
export const getComments = async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId }).sort({ createdAt: 1 }).lean()
  res.json({ comments: comments.map((c) => ({ ...c, id: c._id, userId: c.user?.toString() })) })
}

// POST /api/comments/:postId { text, imageURL, parentCommentId } — atomic + notify
export const addComment = async (req, res) => {
  const { text = '', imageURL = '', parentCommentId = null } = req.body
  const post = await Post.findById(req.params.postId)
  if (!post) return res.status(404).json({ message: 'Post not found' })

  const comment = await Comment.create({
    post: post._id, user: req.user._id,
    displayName: req.user.displayName, photoURL: req.user.photoURL,
    text, imageURL, parentCommentId,
  })
  post.commentCount += 1
  await post.save()

  // Notify post owner; on replies, also notify the parent commenter
  const targets = new Set([post.user.toString()])
  if (parentCommentId) {
    const parent = await Comment.findById(parentCommentId)
    if (parent) targets.add(parent.user.toString())
  }
  targets.delete(req.user._id.toString())
  await Promise.all([...targets].map((uid) =>
    Notification.create({
      recipient: uid, sender: req.user._id,
      senderName: req.user.displayName, senderPhoto: req.user.photoURL,
      type: parentCommentId ? 'reply' : 'comment',
      postId: post._id, postText: post.text?.slice(0, 80),
    }).then((n) => emitToUser(uid, 'notification:new', n))
  ))

  res.status(201).json({ comment: shapeComment(comment) })
}

// PUT /api/comments/:id/like — toggle
export const likeComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id)
  if (!comment) return res.status(404).json({ message: 'Comment not found' })
  const uid = req.user._id.toString()
  const liked = comment.likes.some((l) => l.toString() === uid)
  comment.likes = liked
    ? comment.likes.filter((l) => l.toString() !== uid)
    : [...comment.likes, req.user._id]
  await comment.save()
  res.json({ comment: shapeComment(comment) })
}

// DELETE /api/comments/:id — owner or post owner; cascades replies
export const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id)
  if (!comment) return res.status(404).json({ message: 'Comment not found' })
  const post = await Post.findById(comment.post)
  const isCommentOwner = comment.user.toString() === req.user._id.toString()
  const isPostOwner = post?.user.toString() === req.user._id.toString()
  if (!isCommentOwner && !isPostOwner) {
    return res.status(403).json({ message: 'Not allowed' })
  }
  const replies = await Comment.countDocuments({ parentCommentId: comment._id })
  await Comment.deleteMany({ $or: [{ _id: comment._id }, { parentCommentId: comment._id }] })
  if (post) {
    post.commentCount = Math.max(0, post.commentCount - 1 - replies)
    await post.save()
  }
  res.json({ deleted: true, removedCount: 1 + replies })
}
