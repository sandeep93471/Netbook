import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, Paper, Typography, Button, IconButton, Menu, MenuItem, Tooltip, Tabs, Tab, TextField, InputAdornment, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material'
import { ProfileSkeleton } from '../../components/common/SkeletonLoader'
import { fetchUserProfile, selectCurrentProfile, selectUsersLoading, selectUserById, updateUserProfile } from '../../redux/slices/userSlice'
import { selectFriendship } from '../../redux/slices/friendSlice'
import { selectPostsByUserId } from '../../redux/selectors/postSelectors'
import { getOrCreateConversation } from '../../api/chat'
import api from '../../api/client'
import { setActiveConversation } from '../../redux/slices/chatSlice'

import FriendButton from '../../components/common/FriendButton'
import OnlineStatusDot from '../../components/common/OnlineStatusDot'
import PostCard from '../../components/post/PostCard'
import CropDialog from '../../components/common/CropDialog'
import EmptyState from '../../components/common/EmptyState'
import Highlights from '../../components/profile/Highlights'
import ChatIcon from '@mui/icons-material/Chat'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import LockIcon from '@mui/icons-material/Lock'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { Link } from 'react-router-dom'


const Profile = () => {
  const { userId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const profile = useSelector(selectCurrentProfile)
  const loading = useSelector(selectUsersLoading)
  const { user } = useSelector((state) => state.auth)
  const userPosts = useSelector((state) => selectPostsByUserId(state, userId))
  const { status: friendStatus } = useSelector((state) => selectFriendship(state, userId))

  // Crop state: { src, kind: 'avatar' | 'cover' }
  const [cropState, setCropState] = useState(null)

  const [galleryAnchor, setGalleryAnchor] = useState(null) // { anchorEl, photo }
  const [tab, setTab] = useState(0) // 0 = posts, 1 = friends
  const [friendSearch, setFriendSearch] = useState('')
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const friendIds = profile?.friends || []
  const friendProfiles = useSelector((state) =>
    friendIds.map((id) => selectUserById(state, id)).filter(Boolean)
  )

  useEffect(() => {
    if (userId) dispatch(fetchUserProfile(userId))
  }, [userId, dispatch])

  // Load each friend's profile when the friends tab opens
  useEffect(() => {
    if (tab !== 1) return
    friendIds.slice(0, 50).forEach((id) => {
      dispatch(fetchUserProfile(id)).catch?.(() => {})
    })
  }, [tab, dispatch, friendIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCloseFriend = async (fid) => {
    await api.put(`/users/me/close-friends/${fid}`).catch(() => ({}))
    dispatch(fetchUserProfile(user.uid))
  }

  if (loading) return <ProfileSkeleton />
  if (!profile) return <Typography className="text-center py-20">User not found</Typography>

  const isOwnProfile = user?.uid === userId

  const photoHistory = profile.photoHistory || []

  const handleMessage = async () => {
    const convoId = await getOrCreateConversation(user.uid, userId)
    dispatch(setActiveConversation(convoId))
    navigate('/chat')
  }

  const pickFile = (e, kind) => {
    const file = e.target.files[0]
    if (!file) return
    setCropState({ src: URL.createObjectURL(file), kind })
    e.target.value = ''
  }

  const applyCrop = (file) => {
    dispatch(updateUserProfile(
      cropState.kind === 'avatar'
        ? { uid: user.uid, avatarFile: file }
        : { uid: user.uid, coverFile: file }
    ))
    setCropState(null)
  }

  const reusePhoto = (type, url) => {
    dispatch(updateUserProfile(
      type === 'avatar' ? { uid: user.uid, photoURL: url } : { uid: user.uid, coverURL: url }
    ))
    setGalleryAnchor(null)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover Photo */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-r from-blue-400 to-blue-600">
        {profile.coverURL && (
          <img src={profile.coverURL} alt="Cover" className="w-full h-full object-cover" />
        )}
        {isOwnProfile && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => pickFile(e, 'cover')} />
            <Tooltip title="Change cover photo">
              <IconButton
                className="absolute bottom-3 right-3 bg-white/80 hover:bg-white"
                size="small"
                onClick={() => coverInputRef.current.click()}
                aria-label="Change cover photo"
              >
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </div>

      {/* Profile Info Card */}
      <Paper elevation={2} className="p-6 -mt-20 relative mx-4 rounded-xl">
        <div className="flex flex-col items-center -mt-16">
          <span className="relative inline-block">
            <Avatar
              src={profile.photoURL}
              sx={{ width: 120, height: 120, border: '4px solid white' }}
              className="shadow-lg"
            >
              {profile.displayName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <OnlineStatusDot userId={userId} size={20} />
            {isOwnProfile && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => pickFile(e, 'avatar')} />
                <IconButton
                  className="absolute bottom-1 right-1 bg-white shadow"
                  size="small"
                  onClick={() => avatarInputRef.current.click()}
                  aria-label="Change profile picture"
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </span>

          <Typography variant="h5" className="font-bold mt-4">
            {profile.displayName}
          </Typography>

          {profile.bio && (
            <Typography variant="body1" color="text.secondary" className="mt-2 text-center">
              {profile.bio}
            </Typography>
          )}

          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <Typography variant="h6" className="font-bold">{userPosts.length}</Typography>
              <Typography variant="body2" color="text.secondary">Posts</Typography>
            </div>
            <div className="text-center">
              <Typography variant="h6" className="font-bold">{profile.friends?.length || 0}</Typography>
              <Typography variant="body2" color="text.secondary">Friends</Typography>
            </div>
          </div>

          {isOwnProfile && (
            <Button variant="outlined" className="mt-4" onClick={() => navigate('/edit-profile')}>
              Edit Profile
            </Button>
          )}

          {!isOwnProfile && (
            <div className="flex gap-3 mt-4 flex-wrap justify-center">
              <FriendButton targetUserId={userId} targetName={profile.displayName} />
              {friendStatus === 'friends' && (
                <Button variant="outlined" size="small" startIcon={<ChatIcon />} onClick={handleMessage}>
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </Paper>

      {/* Photo gallery — own profile: reuse as avatar/cover; others: view only */}
      {photoHistory.length > 0 && (
        <Paper elevation={1} className="mt-4 p-4 mx-4 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <PhotoLibraryIcon fontSize="small" className="text-[#64748b]" />
            <Typography variant="subtitle2" className="font-semibold">
              {isOwnProfile ? 'Your photos' : 'Photos'}
            </Typography>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {[...photoHistory].sort((a, b) => (b.at || 0) - (a.at || 0)).map((p, i) =>
              isOwnProfile ? (
                <button
                  key={i}
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition relative"
                  onClick={(e) => setGalleryAnchor({ anchor: e.currentTarget, photo: p })}
                >
                  <img src={p.url} alt={p.type} className="w-full h-full object-cover" />
                </button>
              ) : (
                <a
                  key={i}
                  href={p.url} target="_blank" rel="noreferrer"
                  className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition block"
                >
                  <img src={p.url} alt={p.type} className="w-full h-full object-cover" />
                </a>
              )
            )}
          </div>
          <Menu
            anchorEl={galleryAnchor?.anchor}
            open={!!galleryAnchor}
            onClose={() => setGalleryAnchor(null)}
          >
            <MenuItem onClick={() => reusePhoto('avatar', galleryAnchor.photo.url)}>
              Set as profile picture
            </MenuItem>
            <MenuItem onClick={() => reusePhoto('cover', galleryAnchor.photo.url)}>
              Set as cover photo
            </MenuItem>
          </Menu>
        </Paper>
      )}

      {/* Crop dialog */}
      <CropDialog
        open={!!cropState}
        imageSrc={cropState?.src}
        aspect={cropState?.kind === 'cover' ? 16 / 5 : 1}
        title={cropState?.kind === 'cover' ? 'Crop cover photo' : 'Crop profile picture'}
        onCancel={() => setCropState(null)}
        onDone={applyCrop}
      />

      {/* Story highlights — IG-style circles; private profiles = friends only (server enforces) */}
      {(!profile.isPrivate || profile.canView !== false || isOwnProfile) && (
        <Highlights
          userId={userId}
          isOwnProfile={isOwnProfile}
          displayName={profile.displayName}
          photoURL={profile.photoURL}
        />
      )}

      {/* Tabs — Posts / Friends */}
      <Paper elevation={1} className="mt-4 mx-4 rounded-xl overflow-hidden">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" aria-label="Profile sections">
          <Tab label="Posts" />
          <Tab label={`Friends (${friendIds.length})`} />
        </Tabs>
      </Paper>

      {/* Friends tab — search + close friends + all friends */}
      {tab === 1 && (
        <Paper elevation={1} className="mt-4 mx-4 p-4 rounded-xl">
          <TextField
            fullWidth size="small" placeholder="Search friends..."
            value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> },
            }}
            aria-label="Search friends"
          />
          {(() => {
            const q = friendSearch.trim().toLowerCase()
            const closeIds = new Set(profile.closeFriends || [])
            const filtered = friendProfiles.filter((f) =>
              !q || f.displayName?.toLowerCase().includes(q))
            const close = filtered.filter((f) => closeIds.has(f.uid))
            const rest = filtered.filter((f) => !closeIds.has(f.uid))
            const Row = ({ f }) => (
              <ListItem
                disablePadding
                secondaryAction={
                  isOwnProfile ? (
                    <Tooltip title={closeIds.has(f.uid) ? 'Remove from close friends' : 'Add to close friends'}>
                      <IconButton
                        size="small"
                        aria-label={closeIds.has(f.uid) ? `Remove ${f.displayName} from close friends` : `Add ${f.displayName} to close friends`}
                        onClick={() => toggleCloseFriend(f.uid)}
                        sx={{ color: closeIds.has(f.uid) ? '#1E7A35' : 'text.secondary' }}
                      >
                        {closeIds.has(f.uid) ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                    </Tooltip>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar component={Link} to={`/profile/${f.uid}`} src={f.photoURL}
                    sx={{ width: 44, height: 44, cursor: 'pointer' }}>
                    {f.displayName?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Link to={`/profile/${f.uid}`} className="no-underline text-inherit font-medium hover:underline">
                      {f.displayName}
                    </Link>
                  }
                  secondary={f.bio?.slice(0, 60) || 'Netbook user'}
                />
              </ListItem>
            )
            return (
              <>
                {filtered.length === 0 && (
                  <Typography variant="body2" color="text.secondary" className="text-center py-8">
                    {q ? `No friends matching "${friendSearch}"` : 'No friends yet'}
                  </Typography>
                )}
                {close.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary"
                      className="font-semibold uppercase tracking-wide flex items-center gap-1 mt-3 mb-1">
                      <StarIcon sx={{ fontSize: 14, color: '#1E7A35' }} /> Close friends ({close.length})
                    </Typography>
                    <List dense disablePadding>
                      {close.map((f) => <Row key={f.uid} f={f} />)}
                    </List>
                  </>
                )}
                {rest.length > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary"
                      className="font-semibold uppercase tracking-wide mt-3 mb-1 block">
                      {close.length > 0 ? `All friends (${rest.length})` : `Friends (${rest.length})`}
                    </Typography>
                    <List dense disablePadding>
                      {rest.map((f) => <Row key={f.uid} f={f} />)}
                    </List>
                  </>
                )}
              </>
            )
          })()}
        </Paper>
      )}

      {/* Posts tab — locked for private accounts unless you're friends */}
      {tab === 0 && (
      <div className="mt-6">
        {profile.isPrivate && profile.canView === false ? (
          <Paper elevation={1} className="mx-4 p-8 rounded-xl text-center">
            <LockIcon className="text-gray-400" sx={{ fontSize: 40 }} />
            <Typography variant="h6" className="font-bold mt-2">This account is private</Typography>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              Only friends can see {profile.displayName}'s photos, posts and stories — send a friend request to connect.
            </Typography>
          </Paper>
        ) : (
          <>
            {userPosts.length === 0 ? (
              <EmptyState
                icon={<PhotoLibraryIcon />}
                title="No posts yet"
                description={isOwnProfile ? 'Share your first post from the feed.' : `${profile.displayName} hasn't posted yet.`}
              />
            ) : (
              userPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </>
        )}
      </div>
      )}
    </div>
  )
}

export default Profile
