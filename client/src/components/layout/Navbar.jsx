import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AppBar, Toolbar, Button, Avatar, IconButton, Menu, MenuItem, Badge, InputBase, Divider } from '@mui/material'
import { useState } from 'react'
import HomeIcon from '@mui/icons-material/Home'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import ExploreIcon from '@mui/icons-material/Explore'
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import MovieIcon from '@mui/icons-material/Movie'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import GroupIcon from '@mui/icons-material/Group'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import Tooltip from '@mui/material/Tooltip'
import NotificationsIcon from '@mui/icons-material/Notifications'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import SearchIcon from '@mui/icons-material/Search'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import { logoutUser } from '../../redux/slices/authSlice'
import { selectUnreadCount } from '../../redux/slices/notificationSlice'
import { toggleMode, selectMode } from '../../redux/slices/uiSlice'

// FB-style center tab — icon button with active underline
const CenterTab = ({ to, activeIcon, inactiveIcon, active, label }) => (
  <Tooltip title={label}>
    <IconButton
      component={Link} to={to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      sx={{
        borderRadius: 2, px: { md: 3.5 }, py: 0.5, mx: 0.5, minWidth: 64,
        color: active ? 'primary.main' : 'text.secondary',
        position: 'relative',
        '&::after': active ? {
          content: '""', position: 'absolute', bottom: -9, left: 0, right: 0,
          height: 3, bgcolor: 'primary.main', borderRadius: '3px 3px 0 0',
        } : {},
        '&:hover': { bgcolor: active ? 'transparent' : 'action.hover' },
      }}
    >
      {active ? activeIcon : inactiveIcon}
    </IconButton>
  </Tooltip>
)

const Navbar = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const unreadCount = useSelector(selectUnreadCount)
  const mode = useSelector(selectMode)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState(null)
  const [search, setSearch] = useState('')

  const handleLogout = () => { dispatch(logoutUser()); navigate('/login') }
  const path = location.pathname

  return (
    <AppBar position="sticky" elevation={0}
      sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Toolbar disableGutters sx={{ px: 2, minHeight: 56, gap: 1 }}>

        {/* Left — logo + search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Link to="/" className="flex items-center shrink-0">
            <Avatar
              sx={{
                width: 40, height: 40, fontWeight: 800, fontSize: 22,
                background: 'linear-gradient(135deg, #0A5CE0, #7C3AED)',
              }}
            >N</Avatar>
          </Link>
          {isAuthenticated && (
            <div
              className="hidden sm:flex items-center rounded-full px-3 py-1.5 w-56"
              style={{ backgroundColor: 'var(--nav-input, rgba(0,0,0,0.05))' }}
            >
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <InputBase
                placeholder="Search Netbook"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    const q = search.trim()
                    navigate(q.startsWith('#') ? `/tag/${q.slice(1).toLowerCase()}` : `/explore?q=${encodeURIComponent(q)}`)
                  }
                }}
                sx={{ fontSize: 15, flex: 1, '& input::placeholder': { opacity: 1 } }}
              />
            </div>
          )}
        </div>

        {/* Center — nav tabs (desktop) */}
        {isAuthenticated && (
          <nav aria-label="Main" className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <CenterTab to="/" active={path === '/'} label="Home" activeIcon={<HomeIcon />} inactiveIcon={<HomeOutlinedIcon />} />
            <CenterTab to="/reels" active={path === '/reels'} label="Reels" activeIcon={<MovieIcon />} inactiveIcon={<MovieOutlinedIcon />} />
            <CenterTab to="/friends" active={path === '/friends'} label="Friends" activeIcon={<GroupIcon />} inactiveIcon={<GroupOutlinedIcon />} />
            <CenterTab to="/explore" active={path === '/explore'} label="Explore" activeIcon={<ExploreIcon />} inactiveIcon={<ExploreOutlinedIcon />} />
          </nav>
        )}

        {/* Right — actions + avatar */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1 flex-1 justify-end">
            <IconButton
              component={Link} to="/chat" aria-label="Chat"
              sx={{ bgcolor: 'action.hover', width: 40, height: 40 }}
              className="md:hidden"
            >
              <ChatOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              component={Link} to="/notifications" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              sx={{ bgcolor: path === '/notifications' ? 'rgba(10,92,224,0.12)' : 'action.hover', width: 40, height: 40 }}
            >
              <Badge badgeContent={unreadCount} color="error">
                {path === '/notifications'
                  ? <NotificationsIcon fontSize="small" color="primary" />
                  : <NotificationsOutlinedIcon fontSize="small" />}
              </Badge>
            </IconButton>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu" sx={{ p: 0, ml: 0.5 }}>
              <Avatar src={user?.photoURL} sx={{ width: 40, height: 40 }}>
                {user?.displayName?.charAt(0)}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{ elevation: 4, sx: { mt: 1, minWidth: 220 } }}
            >
              <MenuItem onClick={() => { setAnchorEl(null); navigate(`/profile/${user.uid}`) }}
                sx={{ fontWeight: 600 }}>
                <Avatar src={user?.photoURL} sx={{ width: 36, height: 36, mr: 1.5 }} />
                {user?.displayName}
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); navigate(`/profile/${user.uid}`) }}>
                <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Profile
              </MenuItem>
              <MenuItem onClick={() => dispatch(toggleMode())}>
                {mode === 'dark'
                  ? <><LightModeIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Light mode</>
                  : <><DarkModeIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Dark mode</>}
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Logout
              </MenuItem>
            </Menu>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button component={Link} to="/login" color="inherit">Log in</Button>
            <Button component={Link} to="/register" variant="contained">Sign up</Button>
          </div>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
