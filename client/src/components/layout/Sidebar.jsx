import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Switch, FormControlLabel, ListItemAvatar, TextField, IconButton, Button } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import ExploreIcon from '@mui/icons-material/Explore'
import ChatIcon from '@mui/icons-material/Chat'
import NotificationsIcon from '@mui/icons-material/Notifications'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import GroupIcon from '@mui/icons-material/Group'
import MovieIcon from '@mui/icons-material/Movie'
import SettingsIcon from '@mui/icons-material/Settings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LockIcon from '@mui/icons-material/Lock'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import { useSelector, useDispatch } from 'react-redux'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'
import { fetchFriendRequests } from '../../redux/slices/friendSlice'
import { toggleMode, selectMode } from '../../redux/slices/uiSlice'
import api from '../../api/client'

// Icon colors chosen for ≥3:1 contrast on white (spec §4.1)
const navItems = [
  { label: 'Home', icon: <HomeIcon />, path: '/', color: '#0A5CE0' },
  { label: 'Explore', icon: <ExploreIcon />, path: '/explore', color: '#0084B4' },
  { label: 'Reels', icon: <MovieIcon />, path: '/reels', color: '#F02849' },
  { label: 'Chat', icon: <ChatIcon />, path: '/chat', color: '#7C3AED' },
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', color: '#D91E3F' },
  { label: 'Saved', icon: <BookmarkIcon />, path: '/saved', color: '#A86A00' },
  { label: 'Friends', icon: <GroupIcon />, path: '/friends', color: '#1E7A35' },
]

const Sidebar = () => {
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => (user ? selectUserById(state, user.uid) : null))
  const mode = useSelector(selectMode)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cfDialog, setCfDialog] = useState(false)
  const [friendUsers, setFriendUsers] = useState([])
  const [cfSearch, setCfSearch] = useState('')

  const closeFriends = myProfile?.closeFriends || []

  // Load friend profiles whenever the close-friends editor opens
  useEffect(() => {
    if (!cfDialog || !myProfile?.friends?.length) return
    api.get('/users/basic', { params: { ids: myProfile.friends.join(',') } })
      .then((r) => setFriendUsers(r.data.users))
      .catch(() => {})
  }, [cfDialog]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePrivate = async () => {
    await api.patch('/users/me', { isPrivate: !myProfile?.isPrivate })
    dispatch(fetchUserProfile(user.uid))
  }

  const toggleCloseFriend = async (fid) => {
    const { data } = await api.put(`/users/me/close-friends/${fid}`).catch(() => ({}))
    if (data) dispatch(fetchUserProfile(user.uid))
  }

  useEffect(() => {
    if (user?.uid && !myProfile) dispatch(fetchUserProfile(user.uid))
    if (user?.uid) dispatch(fetchFriendRequests(user.uid))
  }, [dispatch, user?.uid, myProfile])

  return (
    <Paper elevation={0} className="h-full p-2 hidden md:block"
      sx={{ bgcolor: 'transparent', borderRight: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
      <List dense>
        {/* Profile row first — like Facebook */}
        {user && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link} to={`/profile/${user.uid}`}
              selected={location.pathname === `/profile/${user.uid}`}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
              </ListItemIcon>
              <ListItemText primary={user.displayName} primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }} />
            </ListItemButton>
          </ListItem>
        )}
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              component={Link} to={item.path}
              selected={location.pathname === item.path}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: `${item.color}20`, color: item.color }}>
                  {item.icon}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500, fontSize: 15 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Settings — fixed bottom-left like FB/IG sidebars */}
      <div className="sticky bottom-0 px-2 pt-2 pb-1" style={{ background: 'inherit' }}>
        <Divider className="mb-2" />
        <ListItemButton
          onClick={() => setSettingsOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.hover', color: 'text.secondary' }}>
              <SettingsIcon fontSize="small" />
            </Avatar>
          </ListItemIcon>
          <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 500, fontSize: 15 }} />
        </ListItemButton>
        {/* Footer links — consistent help location on every page (WCAG 3.2.6) */}
        <Typography variant="caption" color="text.secondary" className="px-3 pt-1 block leading-relaxed">
          Privacy · Terms · Help · Netbook © 2026
        </Typography>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle className="font-bold">Settings</DialogTitle>
        <DialogContent dividers>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={() => dispatch(toggleMode())} />}
            label={
              <div className="flex items-center gap-2">
                {mode === 'dark' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                <Typography variant="body2" fontWeight={600}>Dark mode</Typography>
              </div>
            }
            sx={{ display: 'flex', justifyContent: 'space-between', ml: 0, width: '100%' }}
            labelPlacement="start"
          />
          <FormControlLabel
            control={<Switch checked={!!myProfile?.isPrivate} onChange={togglePrivate} />}
            label={
              <div className="flex items-center gap-2">
                <LockIcon fontSize="small" />
                <div>
                  <Typography variant="body2" fontWeight={600}>Private account</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Only friends can see your posts, photos and stories
                  </Typography>
                </div>
              </div>
            }
            sx={{ display: 'flex', justifyContent: 'space-between', ml: 0, width: '100%', mt: 1 }}
            labelPlacement="start"
          />

          <Divider sx={{ my: 2 }} />
          {/* Close friends — summary row opens the dedicated editor */}
          <ListItemButton onClick={() => setCfDialog(true)} sx={{ borderRadius: 2, px: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <StarIcon sx={{ color: '#1E7A35' }} />
            </ListItemIcon>
            <ListItemText
              primary="Close friends"
              secondary={`${closeFriends.length} selected — they see your close-friends posts & stories`}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
            />
            <Button size="small" variant="outlined" sx={{ textTransform: 'none' }}>
              Edit
            </Button>
          </ListItemButton>
        </DialogContent>
      </Dialog>

      {/* Close friends editor — add/remove anyone, anytime */}
      <Dialog open={cfDialog} onClose={() => setCfDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle className="font-bold flex items-center gap-2">
          <StarIcon sx={{ color: '#1E7A35' }} /> Edit close friends
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth size="small" placeholder="Search friends..."
            value={cfSearch} onChange={(e) => setCfSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />

          {/* Currently in the list — remove with one tap */}
          {closeFriends.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" className="font-semibold uppercase tracking-wide">
                In your list ({closeFriends.length})
              </Typography>
              <List dense>
                {friendUsers
                  .filter((f) => closeFriends.includes(f.uid))
                  .map((f) => (
                    <ListItem key={f.uid} disablePadding
                      secondaryAction={
                        <IconButton size="small" aria-label={`Remove ${f.displayName}`}
                          onClick={() => toggleCloseFriend(f.uid)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      }>
                      <ListItemAvatar>
                        <Avatar src={f.photoURL} sx={{ width: 36, height: 36 }} />
                      </ListItemAvatar>
                      <ListItemText primary={f.displayName} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
                    </ListItem>
                  ))}
              </List>
              <Divider sx={{ my: 1 }} />
            </>
          )}

          {/* All friends — add with the star */}
          <Typography variant="caption" color="text.secondary" className="font-semibold uppercase tracking-wide">
            Friends
          </Typography>
          {friendUsers.length === 0 ? (
            <Typography variant="body2" color="text.secondary" className="py-2">
              Add friends first — only friends can be close friends.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 260, overflow: 'auto' }}>
              {friendUsers
                .filter((f) => !cfSearch || f.displayName.toLowerCase().includes(cfSearch.toLowerCase()))
                .map((f) => {
                  const inList = closeFriends.includes(f.uid)
                  return (
                    <ListItem key={f.uid} disablePadding
                      secondaryAction={
                        <IconButton
                          size="small"
                          aria-label={inList ? `Remove ${f.displayName}` : `Add ${f.displayName}`}
                          onClick={() => toggleCloseFriend(f.uid)}
                          sx={{ color: inList ? '#F7B928' : 'text.disabled' }}
                        >
                          {inList ? <StarIcon /> : <StarBorderIcon />}
                        </IconButton>
                      }>
                      <ListItemAvatar>
                        <Avatar src={f.photoURL} sx={{ width: 36, height: 36 }} />
                      </ListItemAvatar>
                      <ListItemText primary={f.displayName} primaryTypographyProps={{ fontSize: 14 }} />
                    </ListItem>
                  )
                })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCfDialog(false)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

export default Sidebar
