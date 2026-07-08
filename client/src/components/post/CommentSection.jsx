import { useState, useEffect, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TextField, Button, Avatar, Typography, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import CloseIcon from '@mui/icons-material/Close'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { fetchComments, addComment, deleteComment, likeComment, likeCommentOptimistic, selectCommentsByPostId } from '../../redux/slices/commentSlice'
import { Link } from 'react-router-dom'
import { validateComment } from '../../utils/validation'
import { showError } from '../../utils/errorHandler'
import { timeAgo } from '../../utils/timeAgo'

// Reusable input row (main comment box + reply boxes)
const CommentInput = ({ placeholder, autoFocus, onSubmit, onCancel }) => {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const error = validateComment(text)
    if (error && !imageFile) { showError({ message: error }); return }
    onSubmit(text.trim(), imageFile)
    setText(''); setImageFile(null); setPreview('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <TextField
          fullWidth size="small" placeholder={placeholder}
          value={text} onChange={(e) => setText(e.target.value)}
          variant="outlined" autoFocus={autoFocus}
        />
        <label className="cursor-pointer text-gray-500 hover:text-green-600 transition">
          <ImageIcon fontSize="small" />
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files[0]
              if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)) }
            }}
          />
        </label>
        <Button type="submit" variant="contained" size="small" disabled={!text.trim() && !imageFile}>
          Post
        </Button>
        {onCancel && <Button size="small" onClick={onCancel}>Cancel</Button>}
      </div>
      {preview && (
        <div className="relative inline-block mt-1">
          <img src={preview} alt="" className="max-h-20 rounded-lg" />
          <IconButton size="small" className="absolute top-0 right-0 bg-white/80"
            onClick={() => { setImageFile(null); setPreview('') }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </div>
      )}
    </form>
  )
}

const CommentItem = ({ comment, postId, postUserId, replies, depth }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [replying, setReplying] = useState(false)
  const isLiked = comment.likes?.includes(user?.uid)
  const canDelete = user?.uid === comment.userId || user?.uid === postUserId

  const handleLike = () => {
    dispatch(likeCommentOptimistic({ postId, commentId: comment.id, userId: user.uid }))
    dispatch(likeComment({ postId, commentId: comment.id, userId: user.uid, isLiked }))
  }

  const submitReply = (text, imageFile) => {
    dispatch(addComment({
      postId, text, imageFile,
      parentCommentId: comment.id,
      userId: user.uid, displayName: user.displayName, photoURL: user.photoURL,
    }))
    setReplying(false)
  }

  return (
    <div>
      <div className="flex gap-2">
        <Avatar src={comment.photoURL} sx={{ width: 28, height: 28 }} component={Link} to={`/profile/${comment.userId}`}>
          {comment.displayName?.charAt(0)}
        </Avatar>
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2 inline-block">
            <Typography variant="caption" className="font-semibold block" component={Link}
              to={`/profile/${comment.userId}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
              {comment.displayName}
            </Typography>
            {comment.text && <Typography variant="body2">{comment.text}</Typography>}
            {comment.imageURL && (
              <img src={comment.imageURL} alt="" className="mt-1 max-h-40 rounded-lg" />
            )}
          </div>
          <div className="flex items-center gap-3 px-3 mt-0.5">
            <button
              onClick={handleLike}
              className={`text-xs font-semibold hover:underline ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
            >
              {isLiked ? 'Liked' : 'Like'}
            </button>
            {depth === 0 && (
              <button onClick={() => setReplying(!replying)}
                className="text-xs font-semibold text-gray-500 hover:underline">
                Reply
              </button>
            )}
            <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
            {comment.likes?.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <FavoriteIcon sx={{ fontSize: 12, color: '#e11d48' }} /> {comment.likes.length}
              </span>
            )}
          </div>
          {replying && (
            <div className="mt-2">
              <CommentInput
                placeholder={`Reply to ${comment.displayName}...`}
                autoFocus
                onSubmit={submitReply}
                onCancel={() => setReplying(false)}
              />
            </div>
          )}
          {/* Nested replies */}
          {replies?.length > 0 && (
            <div className="mt-2 space-y-2 ml-2">
              {replies.map((r) => (
                <CommentItem key={r.id} comment={r} postId={postId} postUserId={postUserId} depth={1} />
              ))}
            </div>
          )}
        </div>
        {canDelete && (
          <IconButton size="small" aria-label="Delete comment"
            onClick={() => dispatch(deleteComment({ postId, commentId: comment.id }))}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </div>
    </div>
  )
}

const CommentSection = ({ postId, postUserId }) => {
  const dispatch = useDispatch()
  const comments = useSelector(selectCommentsByPostId(postId))
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(fetchComments(postId))
  }, [postId, dispatch])

  const topLevel = comments.filter((c) => !c.parentCommentId)
  const repliesFor = (id) => comments.filter((c) => c.parentCommentId === id)

  return (
    <div className="border-t px-4 py-3">
      <div className="space-y-3 mb-3 max-h-96 overflow-y-auto">
        {topLevel.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            postUserId={postUserId}
            replies={repliesFor(comment.id)}
            depth={0}
          />
        ))}
        {comments.length === 0 && (
          <Typography variant="body2" color="text.secondary">No comments yet. Be the first!</Typography>
        )}
      </div>

      <CommentInput
        placeholder="Write a comment..."
        onSubmit={(text, imageFile) =>
          dispatch(addComment({
            postId, text, imageFile,
            userId: user.uid, displayName: user.displayName, photoURL: user.photoURL,
          }))
        }
      />
    </div>
  )
}

export default memo(CommentSection)
