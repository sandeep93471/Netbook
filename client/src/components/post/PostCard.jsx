import { useState, memo, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardHeader, Avatar, CardContent, Typography, CardActions, IconButton,
  Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ListItemIcon, ListItemText, Popover, Box,
} from '@mui/material'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import ShareIcon from '@mui/icons-material/Share'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import FlagIcon from '@mui/icons-material/Flag'
import PeopleIcon from '@mui/icons-material/People'
import LockIcon from '@mui/icons-material/Lock'
import PublicIcon from '@mui/icons-material/Public'
import StarIcon from '@mui/icons-material/Star'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Link } from 'react-router-dom'
import { timeAgo } from '../../utils/timeAgo'
import {
  updatePost, deletePost, sharePost, reportPost,
  setReaction, setReactionOptimistic,
} from '../../redux/slices/postSlice'
import PostText from './PostText'
import { toggleSaved, toggleSavePost, selectUserById } from '../../redux/slices/userSlice'
import { validatePost } from '../../utils/validation'
import { showError, showSuccess } from '../../utils/errorHandler'
import OptimizedImage from '../common/OptimizedImage'
import CommentSection from './CommentSection'
import api from '../../api/client'

// Who reacted — opens from the count row, groups by reaction type
const ReactionsDialog = ({ post, open, onClose }) => {
  const [users, setUsers] = useState({})
  const entries = Object.entries(post.reactions || {})

  useEffect(() => {
    if (!open || entries.length === 0) return
    api.get('/users/basic', { params: { ids: entries.map(([uid]) => uid).join(',') } })
      .then((r) => setUsers(Object.fromEntries(r.data.users.map((u) => [u.uid, u]))))
      .catch(() => {})
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reactions</DialogTitle>
      <DialogContent dividers>
        {entries.map(([uid, type]) => (
          <div key={uid} className="flex items-center gap-3 py-2">
            <Avatar src={users[uid]?.photoURL} sx={{ width: 32, height: 32 }}>
              {users[uid]?.displayName?.charAt(0)}
            </Avatar>
            <span className="flex-1 font-medium text-sm">
              {users[uid]?.displayName || 'User'}
            </span>
            <span className="text-lg">{REACTION_MAP[type]?.emoji}</span>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  )
}

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#0A5CE0' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#F02849' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: '#F7B928' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: '#F7B928' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: '#F7B928' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: '#E9710F' },
]
const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r]))

// Post audiences — same set as the composer
const POST_AUDIENCES = [
  { value: 'public', label: 'Public', icon: PublicIcon },
  { value: 'followers', label: 'Friends', icon: PeopleIcon },
  { value: 'closefriends', label: 'Close friends', icon: StarIcon },
  { value: 'onlyme', label: 'Only me', icon: LockIcon },
]

// Embedded card for shared posts
const SharedPostEmbed = ({ shared }) => (
  <Box
    component={Link}
    to={`/post/${shared.id}`}
    className="block mx-4 mb-3 border border-[#e2e8f0] dark:border-[#334155] rounded-xl overflow-hidden no-underline hover:bg-gray-50 dark:hover:bg-gray-800 transition"
  >
    <div className="flex items-center gap-2 px-3 py-2">
      <Avatar src={shared.photoURL} sx={{ width: 28, height: 28 }}>
        {shared.displayName?.charAt(0)}
      </Avatar>
      <Typography variant="subtitle2" className="font-semibold text-black dark:text-white">
        {shared.displayName}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {timeAgo(shared.createdAt)}
      </Typography>
    </div>
    {shared.text && (
      <Typography variant="body2" className="px-3 pb-2 text-[#0f172a] dark:text-[#f1f5f9]">
        {shared.text}
      </Typography>
    )}
    {shared.imageURL && (
      <img src={shared.imageURL} alt="" className="w-full max-h-56 object-cover" />
    )}
  </Box>
)

// memo: skips re-render when the post prop reference hasn't changed
const PostCard = memo(({ post, autoOpenComments = false, index }) => {
  const [showComments, setShowComments] = useState(autoOpenComments)
  const [expanded, setExpanded] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCaption, setShareCaption] = useState('')
  const [reactionAnchor, setReactionAnchor] = useState(null)
  const [reactsOpen, setReactsOpen] = useState(false)
  const [audAnchor, setAudAnchor] = useState(null)
  const hoverTimer = useRef(null)
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => (user ? selectUserById(state, user.uid) : null))
  const dispatch = useDispatch()

  const isOwner = user?.uid === post.userId
  const isSaved = myProfile?.savedPosts?.includes(post.id) || false

  const myReaction = post.reactions?.[user?.uid] || null
  const myReactionDef = myReaction ? REACTION_MAP[myReaction] : null
  // Total = all reactions (likes array only counts 👍, reactions map has all types)
  const likesCount = Object.keys(post.reactions || {}).length
  const timeText = useMemo(() => timeAgo(post.createdAt), [post.createdAt])

  // Per-reaction counts for the summary bar — every emoji + its count (virality at a glance)
  const reactionCounts = useMemo(() => {
    const counts = {}
    Object.values(post.reactions || {}).forEach((t) => { counts[t] = (counts[t] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }))
  }, [post.reactions])

  const react = (type) => {
    const removing = !type || myReaction === type
    const next = removing ? null : type
    dispatch(setReactionOptimistic({ postId: post.id, userId: user.uid, type: next }))
    dispatch(setReaction({ postId: post.id, userId: user.uid, type: next }))
    setReactionAnchor(null)
  }

  // Desktop: hover shows picker; Mobile: long-press shows picker, tap = like
  const openPicker = (e) => setReactionAnchor(e.currentTarget)
  const closePicker = () => {
    hoverTimer.current = setTimeout(() => setReactionAnchor(null), 250)
  }
  const cancelClose = () => clearTimeout(hoverTimer.current)
  const touchTimer = useRef(null)
  const onTouchStart = (e) => {
    touchTimer.current = setTimeout(() => setReactionAnchor(e.currentTarget), 500)
  }
  const onTouchEnd = () => clearTimeout(touchTimer.current)

  // Double-tap/click on media = Like + heart burst (IG/FB universal gesture)
  const lastTap = useRef(0)
  const onMediaTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 350) {
      if (myReaction !== 'like') react('like')
      setHeartBurst(true)
      setTimeout(() => setHeartBurst(false), 700)
    }
    lastTap.current = now
  }

  const handleEditSave = () => {
    const error = validatePost(editText, null)
    if (error) { showError({ message: error }); return }
    dispatch(updatePost({ postId: post.id, text: editText.trim() }))
    setEditing(false)
    setMenuAnchor(null)
  }

  const handleDelete = () => {
    dispatch(deletePost(post.id))
    setConfirmDelete(false)
    setMenuAnchor(null)
  }

  const handleShareSubmit = () => {
    dispatch(sharePost({
      post,
      caption: shareCaption.trim(),
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }))
    setShareOpen(false)
    setShareCaption('')
    showSuccess('Post shared to your feed')
  }

  const handleSave = () => {
    dispatch(toggleSaved({ uid: user.uid, postId: post.id }))
    dispatch(toggleSavePost({ uid: user.uid, postId: post.id, isSaved }))
  }

  if (post.hidden && !isOwner) return null // auto-hidden by reports — after all hooks

  return (
    <Card
      elevation={1} className="mb-3" sx={{ borderRadius: 3 }}
      component="article"
      aria-posinset={index !== undefined ? index + 1 : undefined}
      aria-setsize={index !== undefined ? -1 : undefined}
      aria-labelledby={`post-${post.id}-author`}
    >
      <CardHeader
        avatar={
          <Avatar src={post.photoURL} component={Link} to={`/profile/${post.userId}`}>
            {post.displayName?.charAt(0)}
          </Avatar>
        }
        title={
          <Typography variant="subtitle2" component={Link} to={`/profile/${post.userId}`}
            id={`post-${post.id}-author`}
            className="font-semibold hover:underline no-underline text-black dark:text-white">
            {post.displayName}
          </Typography>
        }
        subheader={
          <span className="flex items-center gap-1">
            {timeText}
            {post.visibility === 'public' && <PublicIcon sx={{ fontSize: 13 }} />}
            {post.visibility === 'followers' && <PeopleIcon sx={{ fontSize: 13 }} />}
            {post.visibility === 'closefriends' && <StarIcon sx={{ fontSize: 13, color: '#1E7A35' }} />}
            {post.visibility === 'onlyme' && <LockIcon sx={{ fontSize: 13 }} />}
          </span>
        }
        action={(
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Post options">
            <MoreVertIcon />
          </IconButton>
        )}
      />

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        {isOwner && (
          <MenuItem onClick={() => { setEditText(post.text); setEditing(true) }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit post</ListItemText>
          </MenuItem>
        )}
        {/* Owner can change audience anytime — FB-style flexibility */}
        {isOwner && (
          <MenuItem onClick={(e) => setAudAnchor(e.currentTarget)}>
            <ListItemIcon>
              {post.visibility === 'closefriends' ? <StarIcon fontSize="small" />
                : post.visibility === 'onlyme' ? <LockIcon fontSize="small" />
                : post.visibility === 'followers' ? <PeopleIcon fontSize="small" />
                : <PublicIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>
              Who can see this?{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                {POST_AUDIENCES.find((a) => a.value === post.visibility)?.label || 'Public'}
              </Typography>
            </ListItemText>
            <ChevronRightIcon fontSize="small" />
          </MenuItem>
        )}
        {/* Audience submenu */}
        <Menu
          anchorEl={audAnchor} open={!!audAnchor}
          onClose={() => setAudAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {POST_AUDIENCES.map((a) => (
            <MenuItem
              key={a.value}
              selected={post.visibility === a.value}
              onClick={() => {
                setAudAnchor(null)
                setMenuAnchor(null)
                if (post.visibility !== a.value) {
                  dispatch(updatePost({ postId: post.id, visibility: a.value }))
                  showSuccess(`Audience set to ${a.label}`)
                }
              }}
            >
              <ListItemIcon><a.icon fontSize="small" /></ListItemIcon>
              <ListItemText>{a.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
        {isOwner && (
          <MenuItem onClick={() => setConfirmDelete(true)}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Delete post</ListItemText>
          </MenuItem>
        )}
        {!isOwner && (
          <MenuItem onClick={() => {
            dispatch(reportPost({ postId: post.id, userId: user.uid }))
            setMenuAnchor(null)
            showSuccess('Report submitted. Thanks for helping keep Netbook safe.')
          }}>
            <ListItemIcon><FlagIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Report post</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Edit dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={3} autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete this post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This can't be undone. Comments on this post will also be removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Share post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={2} autoFocus
            placeholder="Say something about this..."
            value={shareCaption}
            onChange={(e) => setShareCaption(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Box className="mt-3 border border-[#e2e8f0] rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Avatar src={post.photoURL} sx={{ width: 24, height: 24 }} />
              <Typography variant="caption" className="font-semibold">{post.displayName}</Typography>
            </div>
            <Typography variant="body2" className="mt-1 text-[#475467]" noWrap>
              {post.text || '📷 Photo'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleShareSubmit} startIcon={<ShareIcon />}>
            Share now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reaction picker */}
      <Popover
        open={!!reactionAnchor}
        anchorEl={reactionAnchor}
        onClose={() => setReactionAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }}
        slotProps={{ paper: { sx: { pointerEvents: 'auto', borderRadius: 999, px: 0.5 } } }}
      >
        <Box
          className="flex"
          onMouseEnter={cancelClose}
          onMouseLeave={closePicker}
        >
          {REACTIONS.map((r) => (
            <motion.div key={r.type} whileHover={{ scale: 1.4, y: -4 }} whileTap={{ scale: 0.9 }}>
              <IconButton
                onClick={() => react(r.type)}
                aria-label={r.label}
                sx={{ fontSize: '1.5rem', p: 0.5 }}
              >
                {r.emoji}
              </IconButton>
            </motion.div>
          ))}
        </Box>
      </Popover>

      {/* Post body — gradient background for text-only posts */}
      {post.background && !post.imageURL ? (
        <Box
          className="flex items-center justify-center text-center px-8"
          sx={{ background: post.background, minHeight: 220 }}
        >
          <Typography
            variant="h5"
            sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.5, textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
          >
            {post.text}
          </Typography>
        </Box>
      ) : (
        <CardContent className="pt-0">
          {/* "See more" clamp — 5 lines, keeps long posts scannable */}
          <Typography
            variant="body1"
            component="div"
            sx={!expanded ? {
              display: '-webkit-box', WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } : {}}
          >
            <PostText text={post.text} mentionMap={post.mentionMap} />
          </Typography>
          {!expanded && (post.text?.length > 300 || post.text?.split('\n').length > 5) && (
            <Button size="small" onClick={() => setExpanded(true)}
              sx={{ textTransform: 'none', p: 0, minWidth: 0, fontWeight: 600 }}>
              See more
            </Button>
          )}
        </CardContent>
      )}

      {/* Media — double-tap likes (heart burst), like everywhere else too */}
      {(post.imageURL || post.videoURL) && (
        <div className="relative" onClick={onMediaTap} onDoubleClick={onMediaTap}>
          {post.imageURL && (
            <OptimizedImage src={post.imageURL} alt={`Photo by ${post.displayName}`} height={340} />
          )}
          {post.videoURL && (
            <div className="bg-black flex justify-center">
              {/* natural size — portrait reels don't get giant black side bars */}
              <video src={post.videoURL} controls playsInline preload="metadata"
                className="max-w-full max-h-[420px] w-auto" />
            </div>
          )}
          {heartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="animate-heart-burst text-7xl" role="img" aria-label="Liked">❤️</span>
            </div>
          )}
        </div>
      )}

      {post.sharedFrom && <SharedPostEmbed shared={post.sharedFrom} />}

      {/* Reaction summary — FB-style overlapping colored circles + count */}
      {(likesCount > 0 || post.commentCount > 0 || post.shareCount > 0) && (
        <div className="px-4 py-2 text-sm flex items-center justify-between" style={{ color: 'var(--mui-palette-text-secondary, #65676B)' }}>
          <button
            className="flex items-center gap-1 cursor-pointer hover:underline"
            onClick={() => setReactsOpen(true)}
            aria-label={`${likesCount} reactions — see who reacted`}
          >
            {/* Overlapping reaction icons like Facebook */}
            <span className="flex -space-x-1">
              {reactionCounts.slice(0, 3).map(({ type }) => (
                <span
                  key={type}
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] leading-none ring-2 ring-white dark:ring-[#242526]"
                  style={{ backgroundColor: REACTION_MAP[type]?.color }}
                >
                  {REACTION_MAP[type]?.emoji}
                </span>
              ))}
            </span>
            {likesCount > 0 && (
              <span className="font-medium">
                {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}K` : likesCount}
              </span>
            )}
          </button>
          <span>
            {post.commentCount > 0 && `${post.commentCount} comments`}
            {post.commentCount > 0 && post.shareCount > 0 && ' · '}
            {post.shareCount > 0 && `${post.shareCount} shares`}
          </span>
        </div>
      )}

      <CardActions className="justify-around border-t pt-1">
        <Box
          onMouseEnter={openPicker}
          onMouseLeave={closePicker}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <motion.div
            whileTap={{ scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className="flex-1"
          >
            <Button
              size="small"
              fullWidth
              onClick={() => react(myReaction || 'like')}
              aria-pressed={!!myReaction}
              startIcon={
                myReactionDef
                  ? (
                    <motion.span
                      key={myReaction} // re-mounts → pop animation on change
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="text-lg leading-none inline-flex"
                    >
                      {myReactionDef.emoji}
                    </motion.span>
                  )
                  : <ThumbUpOutlinedIcon fontSize="small" />
              }
              sx={{
                // Active reaction = bright reaction color + slightly stronger text
                color: myReactionDef?.color || 'text.secondary',
                textTransform: 'none',
                fontWeight: myReaction ? 700 : 600,
                bgcolor: myReaction ? `${myReactionDef.color}14` : 'transparent',
                '&:hover': { bgcolor: myReaction ? `${myReactionDef.color}1f` : 'action.hover' },
              }}
            >
              {myReactionDef?.label || 'Like'}
            </Button>
          </motion.div>
        </Box>
        <Button
          size="small"
          onClick={() => setShowComments(!showComments)}
          startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, flex: 1 }}
        >
          Comment
        </Button>
        <Button
          size="small"
          onClick={() => setShareOpen(true)}
          startIcon={<ShareIcon fontSize="small" />}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600, flex: 1 }}
        >
          Share
        </Button>
        <IconButton onClick={handleSave} aria-label="Save post" size="small">
          {isSaved ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
        </IconButton>
      </CardActions>

      {showComments && <CommentSection postId={post.id} postUserId={post.userId} />}
      <ReactionsDialog post={post} open={reactsOpen} onClose={() => setReactsOpen(false)} />
    </Card>
  )
})

export default PostCard
