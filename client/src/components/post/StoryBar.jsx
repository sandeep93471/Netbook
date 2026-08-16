import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Avatar, Dialog, IconButton, Typography, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { fetchActiveStories, addStory } from '../../api/stories'
import api from '../../api/client'
import { showError, showSuccess } from '../../utils/errorHandler'
import { timeAgo } from '../../utils/timeAgo'

const STORY_DURATION = 5000

// Full-screen viewer — auto-advances every 5s like Instagram.
// onNextGroup/onPrevGroup jump between users' story groups (optional).
export const StoryViewer = ({ group, onClose, isOwner, onNextGroup, onPrevGroup }) => {
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const story = group.stories[index]
  const elapsed = useRef(0)

  // Record my view on each story (deduped server-side) — IG "viewed by" list
  useEffect(() => {
    if (story?.id && !isOwner) api.post(`/stories/${story.id}/view`).catch(() => {})
  }, [story?.id, isOwner])

  const goPrev = () => {
    if (index > 0) setIndex(index - 1)
    else onPrevGroup?.()
  }
  const goNext = () => {
    if (index < group.stories.length - 1) setIndex(index + 1)
    else onNextGroup ? onNextGroup() : onClose()
  }

  // Progress tick — pauses on hold/hover/tab-hidden. Reset on story change.
  useEffect(() => {
    elapsed.current = 0
    let last = Date.now()
    const tick = setInterval(() => {
      const now = Date.now()
      if (!paused && !document.hidden) elapsed.current += now - last
      last = now
      const pct = (elapsed.current / STORY_DURATION) * 100
      if (pct >= 100) {
        clearInterval(tick)
        goNext()
      } else {
        setProgress(pct)
      }
    }, 50)
    return () => clearInterval(tick)
  }, [index, group, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: ← prev, → next, Space pause, Esc close (Esc handled by Dialog too)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!story) return null
  return (
    <Dialog open fullScreen onClose={onClose} PaperProps={{ sx: { background: '#000' } }}>
      <div className="relative h-full flex items-center justify-center select-none">

        {/* Prev / next arrows — outside the frame (desktop) */}
        <IconButton
          onClick={goPrev}
          aria-label="Previous story"
          sx={{
            position: 'absolute', left: { xs: 8, md: 'calc(50% - 260px)' }, top: '50%',
            transform: 'translateY(-50%)', zIndex: 30,
            color: '#fff', bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          onClick={goNext}
          aria-label="Next story"
          sx={{
            position: 'absolute', right: { xs: 8, md: 'calc(50% - 260px)' }, top: '50%',
            transform: 'translateY(-50%)', zIndex: 30,
            color: '#fff', bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
          }}
        >
          <ChevronRightIcon />
        </IconButton>

        {/* Story frame — 9:16 card like Instagram web */}
        <div
          className="relative overflow-hidden rounded-2xl bg-[#1a1a1a]"
          style={{ width: 'min(420px, 94vw)', height: 'min(88vh, 746px)' }}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          <img
            src={story.imageURL} alt={`Story by ${group.displayName}`}
            className="w-full h-full object-cover"
          />

          {/* top scrim — progress + header legibility */}
          <div className="absolute top-0 left-0 right-0 h-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(rgba(0,0,0,.55), transparent)' }} />

          {/* progress bars — inside the frame */}
          <div className="absolute top-3 left-0 right-0 flex gap-1 px-3 z-20">
            {group.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded">
                <div
                  className="h-full bg-white rounded"
                  style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* header — avatar, name, time, close */}
          <div className="absolute top-6 left-3 right-3 flex items-center gap-2 z-20">
            <Avatar src={group.photoURL} sx={{ width: 34, height: 34, border: '2px solid rgba(255,255,255,.7)' }} />
            <div className="flex-1 min-w-0">
              <Typography variant="subtitle2" className="text-white font-semibold leading-tight truncate">
                {group.displayName}
              </Typography>
              <Typography variant="caption" className="text-white/70 leading-tight">
                {timeAgo(story.createdAt)}
              </Typography>
            </div>
            <IconButton onClick={onClose} aria-label="Close story" size="small"
              sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
          </div>

          {/* Tap zones — inside frame: left third prev, right two-thirds next */}
          <button className="absolute left-0 top-0 bottom-16 w-1/3 z-10" onClick={goPrev} aria-label="Previous" />
          <button className="absolute right-0 top-0 bottom-16 w-2/3 z-10" onClick={goNext} aria-label="Next" />

          {/* Paused indicator */}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-white/70 text-5xl">❚❚</span>
            </div>
          )}

          {/* Bottom: owner → view count; viewer → reply bar */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-20"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.55))' }}>
            {isOwner ? (
              <div className="flex items-center justify-center gap-1.5 text-white/90">
                <VisibilityIcon fontSize="small" />
                <Typography variant="caption" className="text-white font-medium">
                  {story.viewCount || story.viewers?.length || 0} views
                </Typography>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  placeholder={`Reply to ${group.displayName}...`}
                  className="flex-1 bg-transparent border border-white/40 rounded-full px-4 py-2 text-sm text-white placeholder-white/60 outline-none focus:border-white"
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      showSuccess('Reply sent')
                      e.target.value = ''
                    }
                  }}
                />
                <IconButton size="small" aria-label="Love" sx={{ color: '#fff' }}
                  onClick={(e) => { e.stopPropagation(); showSuccess('❤️ sent') }}>
                  ❤️
                </IconButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}

const StoryBar = () => {
  const { user } = useSelector((state) => state.auth)
  const [groups, setGroups] = useState([])
  const [viewing, setViewing] = useState(null)
  const [pendingFile, setPendingFile] = useState(null) // audience picker before upload
  const fileRef = useRef(null)

  const load = () => fetchActiveStories().then(setGroups).catch(() => {})
  useEffect(() => { load() }, [])

  const handleAdd = (e) => {
    const file = e.target.files[0]
    if (file) setPendingFile(file)
    e.target.value = ''
  }

  const postStory = async (closeFriendsOnly) => {
    try {
      await addStory({ imageFile: pendingFile, closeFriendsOnly })
      showSuccess(closeFriendsOnly ? 'Story shared with close friends' : 'Story posted')
      setPendingFile(null)
      load()
    } catch (err) {
      showError(err)
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 mb-4 px-1">
      {/* Your story */}
      <button
        onClick={() => fileRef.current.click()}
        className="flex flex-col items-center gap-1 shrink-0"
      >
        <span className="relative">
          <Avatar src={user?.photoURL} sx={{ width: 56, height: 56 }}>
            {user?.displayName?.charAt(0)}
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 bg-[#0A5CE0] rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-[#242526]">
            <AddIcon sx={{ fontSize: 14, color: '#fff' }} />
          </span>
        </span>
        <span className="text-xs font-medium">Your story</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAdd} />

      {groups.map((g) => (
        <button
          key={g.userId}
          onClick={() => setViewing(g)}
          className="flex flex-col items-center gap-1 shrink-0"
          aria-label={`Story by ${g.displayName}${g.allSeen ? ' (seen)' : ''}`}
        >
          {/* Ring state: close-friends = green, unseen = brand gradient, seen = grey */}
          <span className={g.closeFriends ? 'story-ring-close' : g.allSeen ? 'story-ring-seen' : 'story-ring'}>
            <Avatar src={g.photoURL} sx={(theme) => ({ width: 50, height: 50, border: `2px solid ${theme.palette.background.paper}` })}>
              {g.displayName?.charAt(0)}
            </Avatar>
          </span>
          <span className="text-xs font-medium max-w-[64px] truncate" style={{ color: 'inherit' }}>{g.displayName}</span>
        </button>
      ))}

      {/* Audience picker — like IG's "Your story / Close friends" choice */}
      <Dialog open={!!pendingFile} onClose={() => setPendingFile(null)} maxWidth="xs" fullWidth>
        <div className="p-4">
          <Typography variant="h6" className="font-bold mb-3">Share story to</Typography>
          {pendingFile && (
            <img src={URL.createObjectURL(pendingFile)} alt="" className="w-full max-h-48 object-cover rounded-lg mb-3" />
          )}
          <div className="flex gap-2">
            <Button variant="contained" fullWidth onClick={() => postStory(false)}>
              Everyone
            </Button>
            <Button variant="outlined" fullWidth color="success" onClick={() => postStory(true)}>
              ★ Close friends
            </Button>
          </div>
        </div>
      </Dialog>

      {viewing && (
        <StoryViewer
          group={viewing}
          isOwner={viewing.userId === user?.uid}
          onClose={() => { setViewing(null); load() }}
          onNextGroup={() => {
            const i = groups.findIndex((g) => g.userId === viewing.userId)
            i < groups.length - 1 ? setViewing(groups[i + 1]) : (setViewing(null), load())
          }}
          onPrevGroup={() => {
            const i = groups.findIndex((g) => g.userId === viewing.userId)
            if (i > 0) setViewing(groups[i - 1])
          }}
        />
      )}
    </div>
  )
}

export default StoryBar
