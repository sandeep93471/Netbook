import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Paper, Avatar, TextField, Button, IconButton, Box, Tooltip, Popover, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import CloseIcon from '@mui/icons-material/Close'
import PaletteIcon from '@mui/icons-material/Palette'
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions'
import PublicIcon from '@mui/icons-material/Public'
import PeopleIcon from '@mui/icons-material/People'
import LockIcon from '@mui/icons-material/Lock'
import StarIcon from '@mui/icons-material/Star'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import VideocamIcon from '@mui/icons-material/Videocam'
import Picker from '@emoji-mart/react'
import emojiData from '@emoji-mart/data'
import { createPost } from '../../redux/slices/postSlice'
import { validatePost } from '../../utils/validation'
import { showError } from '../../utils/errorHandler'

// Facebook-style post backgrounds (text-only posts)
const POST_BACKGROUNDS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
]

// FB-style audience selector options
const AUDIENCES = [
  { value: 'public', label: 'Public', desc: 'Anyone on Netbook', icon: PublicIcon },
  { value: 'followers', label: 'Friends', desc: 'Only your friends', icon: PeopleIcon },
  { value: 'closefriends', label: 'Close friends', desc: 'Your close friends list', icon: StarIcon },
  { value: 'onlyme', label: 'Only me', desc: 'Visible only to you', icon: LockIcon },
]

const MAX_VIDEO_SECONDS = 300 // reels cap — 5 minutes

const CreatePost = () => {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [previewIsVideo, setPreviewIsVideo] = useState(false)
  const [background, setBackground] = useState(null)
  const [showBackgrounds, setShowBackgrounds] = useState(false)
  const [emojiAnchor, setEmojiAnchor] = useState(null)
  const [visibility, setVisibility] = useState('public')
  const [audAnchor, setAudAnchor] = useState(null)
  const textRef = useRef(null)
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { loading } = useSelector((state) => state.posts)

  // Insert emoji at the cursor position (default: end of text)
  const handleEmoji = (emoji) => {
    const el = textRef.current?.querySelector('textarea')
    const pos = el?.selectionStart ?? text.length
    setText(text.slice(0, pos) + emoji.native + text.slice(pos))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(pos + emoji.native.length, pos + emoji.native.length)
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setVideoFile(null)
      setPreviewIsVideo(false)
      setPreview(URL.createObjectURL(file))
      setBackground(null) // image beats background
      setShowBackgrounds(false)
    }
  }

  // Reels — accepts video, rejects anything over 5 minutes
  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const probe = document.createElement('video')
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => {
      if (probe.duration > MAX_VIDEO_SECONDS) {
        URL.revokeObjectURL(url)
        showError({ message: 'Videos must be 5 minutes or shorter' })
        return
      }
      setVideoFile(file)
      setImageFile(null)
      setPreviewIsVideo(true)
      setPreview(url)
      setBackground(null)
      setShowBackgrounds(false)
    }
    probe.src = url
    e.target.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validatePost(text, imageFile, videoFile)
    if (error) { showError({ message: error }); return }
    await dispatch(createPost({
      text: text.trim(),
      imageFile,
      videoFile,
      background: imageFile || videoFile ? null : background,
      visibility,
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }))
    setText('')
    setImageFile(null)
    setVideoFile(null)
    setPreview('')
    setPreviewIsVideo(false)
    setBackground(null)
    setShowBackgrounds(false)
  }

  return (
    <Paper elevation={1} className="p-3 mb-4" sx={{ borderRadius: 2 }}>
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 items-start">
          <Avatar src={user?.photoURL}>
            {user?.displayName?.charAt(0)}
          </Avatar>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={6}
            placeholder={`What's on your mind, ${user?.displayName?.split(' ')[0]}?`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
            size="small"
            ref={textRef}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 5,
                fontSize: '1.0625rem',
              },
            }}
          />
        </div>

        {preview && (
          <div className="relative mt-3 inline-block">
            {previewIsVideo ? (
              <video src={preview} controls className="max-h-64 rounded-lg max-w-full" />
            ) : (
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
            )}
            <IconButton
              size="small"
              className="absolute top-1 right-1 bg-white/80"
              onClick={() => { setImageFile(null); setVideoFile(null); setPreview(''); setPreviewIsVideo(false) }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
        )}

        {/* Live preview of background posts */}
        {background && !imageFile && text.trim() && (
          <Box
            className="mt-3 rounded-xl flex items-center justify-center text-center px-6"
            sx={{ background, minHeight: 120 }}
          >
            <span className="text-white font-semibold text-lg" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
              {text}
            </span>
          </Box>
        )}

        {/* Background swatches — text-only posts */}
        {showBackgrounds && !imageFile && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {POST_BACKGROUNDS.map((bg) => (
              <Tooltip key={bg} title="Background">
                <button
                  type="button"
                  onClick={() => setBackground(background === bg ? null : bg)}
                  className="w-10 h-10 rounded-lg transition-transform hover:scale-110"
                  style={{
                    background: bg,
                    outline: background === bg ? '3px solid #0866FF' : 'none',
                    outlineOffset: 2,
                  }}
                />
              </Tooltip>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <div className="flex gap-1">
            <label className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition">
              <ImageIcon className="text-green-500" />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            <Tooltip title="Video / Reel (up to 5 min)">
              <label className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition">
                <VideocamIcon className="text-rose-500" />
                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
            </Tooltip>
            <IconButton
              onClick={() => setShowBackgrounds(!showBackgrounds)}
              disabled={!!imageFile || !!videoFile}
              aria-label="Post background"
              className={showBackgrounds ? 'text-[#7c3aed]' : ''}
            >
              <PaletteIcon />
            </IconButton>
            <Tooltip title="Emoji">
              <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} aria-label="Emoji picker">
                <EmojiEmotionsIcon className="text-amber-500" />
              </IconButton>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            {/* Audience selector */}
            {(() => {
              const A = AUDIENCES.find((a) => a.value === visibility)
              const AudIcon = A.icon
              return (
                <Button
                  size="small" variant="outlined"
                  startIcon={<AudIcon fontSize="small" />}
                  endIcon={<ExpandMoreIcon fontSize="small" />}
                  onClick={(e) => setAudAnchor(e.currentTarget)}
                  sx={{ borderRadius: 5, textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
                >
                  {A.label}
                </Button>
              )
            })()}
            <Button type="submit" variant="contained" disabled={loading || (!text.trim() && !imageFile && !videoFile)}
              sx={{ borderRadius: 5, px: 3 }}>
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </form>

      <Menu anchorEl={audAnchor} open={!!audAnchor} onClose={() => setAudAnchor(null)}>
        {AUDIENCES.map((a) => (
          <MenuItem
            key={a.value}
            selected={visibility === a.value}
            onClick={() => { setVisibility(a.value); setAudAnchor(null) }}
          >
            <ListItemIcon><a.icon fontSize="small" /></ListItemIcon>
            <ListItemText primary={a.label} secondary={a.desc} />
          </MenuItem>
        ))}
      </Menu>

      <Popover
        open={!!emojiAnchor}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Picker data={emojiData} onEmojiSelect={handleEmoji} theme="auto" previewPosition="none" skinTonePosition="none" />
      </Popover>
    </Paper>
  )
}

export default CreatePost
