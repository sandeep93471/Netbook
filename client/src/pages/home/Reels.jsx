import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, IconButton, Typography, CircularProgress, Tooltip } from '@mui/material'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import FriendButton from '../../components/common/FriendButton'
import EmptyState from '../../components/common/EmptyState'
import MovieIcon from '@mui/icons-material/Movie'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'
import { setReaction } from '../../redux/slices/postSlice'

// Persisted mute state — IG/Messenger behavior (default muted so autoplay works)
const MUTE_KEY = 'reelsMuted'
const getMuted = () => localStorage.getItem(MUTE_KEY) !== 'false'

// One reel — video fills the card, overlay shows creator + actions
const ReelCard = ({ post, muted, onToggleMute }) => {
  const videoRef = useRef(null)
  const wrapRef = useRef(null)
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [liked, setLiked] = useState(!!post.reactions?.[user?.uid])
  const [likes, setLikes] = useState(post.likes?.length || 0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [burst, setBurst] = useState(false)
  const lastTap = useRef(0)

  // Autoplay when ~60% visible — scroll-snap keeps one reel active
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? el.play().catch(() => {}) : el.pause() },
      { threshold: 0.6 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Progress bar
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onTime = () => setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0)
    el.addEventListener('timeupdate', onTime)
    return () => el.removeEventListener('timeupdate', onTime)
  }, [])

  const like = () => {
    if (!liked) {
      setLiked(true)
      setLikes((n) => n + 1)
      dispatch(setReaction({ postId: post.id, userId: user.uid, type: 'like' }))
    }
  }

  const toggleLike = () => {
    const next = !liked
    setLiked(next)
    setLikes((n) => n + (next ? 1 : -1))
    dispatch(setReaction({ postId: post.id, userId: user.uid, type: next ? 'like' : null }))
  }

  // Tap = play/pause · double-tap = like + heart burst
  const onTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 350) {
      // double tap → like (and never pause)
      lastTap.current = 0
      like()
      setBurst(true)
      setTimeout(() => setBurst(false), 700)
      return
    }
    lastTap.current = now
    // single tap → pause after the double-tap window
    setTimeout(() => {
      if (lastTap.current && Date.now() - lastTap.current >= 340) {
        const el = videoRef.current
        if (!el) return
        if (el.paused) { el.play(); setPaused(false) } else { el.pause(); setPaused(true) }
      }
    }, 350)
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full snap-start flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={post.videoURL}
        className="h-full max-h-full w-full object-contain"
        loop
        muted={muted}
        playsInline
        preload="metadata"
        onClick={onTap}
        aria-label={`Reel by ${post.displayName}`}
      />

      {/* double-tap heart burst */}
      {burst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <FavoriteIcon className="animate-heart-burst" sx={{ fontSize: 96, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.5))' }} />
        </div>
      )}

      {/* pause indicator flash */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PlayArrowIcon sx={{ fontSize: 72, color: 'rgba(255,255,255,.8)' }} />
        </div>
      )}

      {/* bottom overlay — creator, caption, actions on scrim gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 p-4 pb-6"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.65))' }}
      >
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={post.photoURL} component={Link} to={`/profile/${post.userId}`}
              sx={{ width: 40, height: 40, border: '2px solid #fff' }}>
              {post.displayName?.charAt(0)}
            </Avatar>
            <div className="min-w-0">
              <Typography variant="subtitle2" component={Link} to={`/profile/${post.userId}`}
                className="text-white font-bold no-underline block truncate">
                {post.displayName}
              </Typography>
              {post.text && (
                <Typography variant="caption" className="text-white/80 line-clamp-2">
                  {post.text}
                </Typography>
              )}
            </div>
            {user?.uid !== post.userId && (
              <FriendButton targetUserId={post.userId} targetName={post.displayName} />
            )}
          </div>

          {/* action rail — 44px targets */}
          <div className="flex flex-col items-center gap-3 shrink-0 ml-3">
            <div className="flex flex-col items-center">
              <IconButton onClick={toggleLike} aria-label={liked ? 'Unlike' : 'Like'}
                aria-pressed={liked}
                sx={{ color: liked ? '#F02849' : '#fff', width: 44, height: 44 }}>
                {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="caption" className="text-white -mt-2">{likes}</Typography>
            </div>
            <IconButton component={Link} to={`/post/${post.id}`} sx={{ color: '#fff', width: 44, height: 44 }}
              aria-label="Comments">
              <ChatBubbleOutlineIcon />
            </IconButton>
            <Tooltip title={muted ? 'Unmute' : 'Mute'}>
              <IconButton onClick={onToggleMute} sx={{ color: '#fff', width: 44, height: 44 }}
                aria-label={muted ? 'Unmute' : 'Mute'}>
                {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* progress bar — pinned to the very bottom edge of the reel, 3px,
          doesn't distract from the content; click/drag to scrub */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/25 cursor-pointer z-20"
        onClick={(e) => {
          e.stopPropagation()
          const rect = e.currentTarget.getBoundingClientRect()
          const el = videoRef.current
          if (el?.duration) el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration
        }}
        role="progressbar" aria-label="Reel progress" aria-valuenow={Math.round(progress)}
      >
        <div className="h-full bg-white" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

const Reels = () => {
  const [reels, setReels] = useState(null)
  const [muted, setMuted] = useState(getMuted)
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => (user ? selectUserById(state, user.uid) : null))
  const containerRef = useRef(null)

  useEffect(() => {
    if (user?.uid && !myProfile) dispatch(fetchUserProfile(user.uid))
    api.get('/posts/reels').then((r) => setReels(r.data.posts)).catch(() => setReels([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    setMuted((m) => {
      localStorage.setItem(MUTE_KEY, String(!m))
      return !m
    })
  }

  // Keyboard: ↑/↓ prev/next reel, M mute
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input,textarea')) return
      const el = containerRef.current
      if (!el) return
      const h = el.clientHeight
      if (e.key === 'ArrowDown') { e.preventDefault(); el.scrollBy({ top: h, behavior: 'smooth' }) }
      if (e.key === 'ArrowUp') { e.preventDefault(); el.scrollBy({ top: -h, behavior: 'smooth' }) }
      if (e.key.toLowerCase() === 'm') toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (reels === null) {
    return <div className="flex justify-center py-20"><CircularProgress /></div>
  }

  if (reels.length === 0) {
    return (
      <div className="max-w-md mx-auto pt-10">
        <EmptyState
          icon={<MovieIcon className="text-gray-300" sx={{ fontSize: 64 }} />}
          title="No reels yet"
          description="Post a video (up to 5 minutes) from the composer — it'll show up here"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-96px)] max-w-[420px] mx-auto overflow-y-scroll snap-y snap-mandatory rounded-xl"
      style={{ scrollbarWidth: 'none', scrollSnapStop: 'always' }}
    >
      {reels.map((post) => (
        <div key={post.id} className="h-full snap-start">
          <ReelCard post={post} muted={muted} onToggleMute={toggleMute} />
        </div>
      ))}
    </div>
  )
}

export default Reels
