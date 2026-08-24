import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { TextField, InputAdornment, Avatar, Typography, Paper, CircularProgress, Tabs, Tab, IconButton, Skeleton } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useDebounce } from '../../hooks/useDebounce'
import { searchUsers } from '../../api/firestore'
import { searchPosts } from '../../redux/slices/postSlice'
import api from '../../api/client'
import PostCard from '../../components/post/PostCard'
import { fetchUserProfile, selectUserById, recordSearch, removeSearch } from '../../redux/slices/userSlice'
import { Link, useSearchParams } from 'react-router-dom'
import FriendButton from '../../components/common/FriendButton'
import EmptyState from '../../components/common/EmptyState'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import HistoryIcon from '@mui/icons-material/History'

// Instagram-style media tile — hover shows engagement counts.
// Media is absolutely positioned so videos can't stretch the square tile.
const MediaTile = ({ post }) => (
  <Link
    to={`/post/${post.id}`}
    className="relative block overflow-hidden rounded-lg bg-black group"
    style={{ aspectRatio: '1 / 1' }}
    aria-label={`Post by ${post.displayName}`}
  >
    {post.imageURL ? (
      <img src={post.imageURL} alt="" loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
    ) : (
      <video src={post.videoURL} muted preload="metadata" playsInline
        className="absolute inset-0 w-full h-full object-cover" />
    )}
    {post.videoURL && (
      <PlayArrowIcon sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }} />
    )}
    {/* engagement overlay on hover */}
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-semibold text-sm">
      <span className="flex items-center gap-1">
        <FavoriteIcon sx={{ fontSize: 18 }} /> {(post.likes?.length || 0) + Object.keys(post.reactions || {}).length}
      </span>
      <span className="flex items-center gap-1">
        <ChatBubbleIcon sx={{ fontSize: 18 }} /> {post.commentCount || 0}
      </span>
    </div>
  </Link>
)

const Explore = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [postResults, setPostResults] = useState(null)
  const [tab, setTab] = useState(0) // 0 = top (grid), 1 = people, 2 = posts
  const [loading, setLoading] = useState(false)
  const [gridPosts, setGridPosts] = useState(null)
  const debouncedTerm = useDebounce(searchTerm, 400)
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()

  // Navbar search navigates here with ?q= — seed the box on arrival/change.
  // "Adjust state during render" pattern (React docs) — no effect needed.
  const q = searchParams.get('q')
  const [lastQ, setLastQ] = useState(null)
  if (q !== lastQ) {
    setLastQ(q)
    if (q) { setSearchTerm(q); setTab(1) }
  }
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => (user ? selectUserById(state, user.uid) : null))

  // Ensure own profile is loaded so we know who we already friend
  useEffect(() => {
    if (user?.uid && !myProfile) dispatch(fetchUserProfile(user.uid))
  }, [dispatch, user?.uid, myProfile])

  // Explore grid — media posts ranked by engagement
  useEffect(() => {
    api.get('/posts/explore')
      .then((r) => setGridPosts(r.data.posts))
      .catch(() => setGridPosts([]))
  }, [])

  useEffect(() => {
    const term = debouncedTerm.trim()
    if (!term) return
    let active = true
    searchUsers(term)
      .then((users) => { if (active) { setResults(users); setLoading(false) } })
      .catch((err) => { console.error('Search failed:', err); if (active) setLoading(false) })
    return () => { active = false }
  }, [debouncedTerm])

  // Post search — word match on searchTerms
  useEffect(() => {
    const term = debouncedTerm.trim()
    if (!term || tab !== 2) return
    dispatch(searchPosts(term)).then((res) => {
      if (res.payload) setPostResults({ term, posts: res.payload })
    })
  }, [debouncedTerm, tab, dispatch])

  const searching = Boolean(debouncedTerm.trim())

  return (
    <div className="max-w-3xl mx-auto">
      <Typography variant="h5" className="font-bold mb-4">Explore</Typography>

      <TextField
        fullWidth
        placeholder="Search people, posts, #tags..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          setLoading(Boolean(e.target.value.trim()))
          if (e.target.value.trim() && tab === 0) setTab(1)
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon /></InputAdornment>
            ),
          },
        }}
        variant="outlined"
        size="medium"
        className="mb-4"
        aria-label="Search"
      />

      {searching && (
        <Tabs value={tab === 0 ? 1 : tab} onChange={(_, v) => setTab(v)} className="mb-4" aria-label="Search filters">
          <Tab label="People" value={1} />
          <Tab label="Posts" value={2} />
        </Tabs>
      )}

      {/* Recent searches — shown when the box is empty */}
      {!searchTerm.trim() && (myProfile?.searchHistory?.length > 0) && (
        <div className="mb-4">
          <Typography variant="caption" color="text.secondary" className="font-semibold uppercase tracking-wide">
            Recent searches
          </Typography>
          <div className="flex flex-wrap gap-2 mt-2">
            {myProfile.searchHistory.map((h, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-sm transition cursor-pointer"
              >
                <button onClick={() => { setSearchTerm(h.term); setTab(1) }} className="flex items-center gap-1.5">
                  <HistoryIcon sx={{ fontSize: 14 }} /> {h.term}
                </button>
                <IconButton
                  size="small" aria-label="Remove search"
                  onClick={(e) => { e.stopPropagation(); dispatch(removeSearch({ term: h.term })) }}
                  sx={{ p: 0, ml: 0.5 }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </span>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center"><CircularProgress /></div>}

      {/* Default / Top tab — IG-style media grid */}
      {!searching && (
        gridPosts === null ? (
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="aspect-square" sx={{ borderRadius: 2 }} />
            ))}
          </div>
        ) : gridPosts.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 64 }} />}
            title="Nothing to explore yet"
            description="Posts with photos and videos will show up here"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {gridPosts.map((post) => <MediaTile key={post.id} post={post} />)}
          </div>
        )
      )}

      {/* Posts results */}
      {searching && tab === 2 && (
        <div className="max-w-[600px] mx-auto">
          {(postResults?.term === debouncedTerm.trim() ? postResults.posts : [])
            .filter((p) => !p.hidden).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          {debouncedTerm.trim() && postResults?.term === debouncedTerm.trim() && postResults.posts.length === 0 && (
            <EmptyState
              icon={<PersonSearchIcon className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 64 }} />}
              title="No posts found"
              description={`No posts contain "${debouncedTerm}"`}
            />
          )}
        </div>
      )}

      {/* People results */}
      {searching && tab === 1 && (
        <div className="space-y-2 max-w-[600px] mx-auto">
          {(debouncedTerm.trim() ? results : []).map((u) => (
            <Paper key={u.uid} elevation={1} className="p-3 flex items-center justify-between">
              <Link
                to={`/profile/${u.uid}`}
                className="flex items-center gap-3 no-underline text-inherit min-w-0"
                onClick={() => dispatch(recordSearch({ uid: user.uid, term: u.displayName }))}
              >
                <Avatar src={u.photoURL} sx={{ width: 44, height: 44 }}>{u.displayName?.charAt(0)}</Avatar>
                <div className="min-w-0">
                  <Typography variant="subtitle2" className="font-semibold truncate">{u.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary" className="truncate block">
                    {u.bio?.slice(0, 50) || 'Netbook user'}
                  </Typography>
                </div>
              </Link>
              <FriendButton targetUserId={u.uid} targetName={u.displayName} />
            </Paper>
          ))}

          {debouncedTerm.trim() && !loading && results.length === 0 && (
            <EmptyState
              icon={<PersonSearchIcon className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 64 }} />}
              title="No users found"
              description={`No results for "${debouncedTerm}"`}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default Explore
