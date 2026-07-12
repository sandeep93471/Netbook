import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material'
import HomeIcon from '@mui/icons-material/Home'
import ExploreIcon from '@mui/icons-material/Explore'
import ChatIcon from '@mui/icons-material/Chat'
import MovieIcon from '@mui/icons-material/Movie'
import PersonIcon from '@mui/icons-material/Person'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

// Mobile bottom nav — labelled icons (icons alone are ambiguous per NN/g),
// 5 destinations max, safe-area padded, never hides on scroll
const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSelector((state) => state.auth)

  const items = [
    { label: 'Home', icon: <HomeIcon />, path: '/' },
    { label: 'Explore', icon: <ExploreIcon />, path: '/explore' },
    { label: 'Reels', icon: <MovieIcon />, path: '/reels' },
    { label: 'Chat', icon: <ChatIcon />, path: '/chat' },
    { label: 'Profile', icon: <PersonIcon />, path: user ? `/profile/${user.uid}` : '/' },
  ]

  const current = items.findIndex((i) => i.path === location.pathname)

  return (
    <Paper
      className="block md:hidden fixed bottom-0 left-0 right-0 z-50"
      elevation={3}
      sx={{ pb: 'env(safe-area-inset-bottom)' }}
    >
      <BottomNavigation
        value={current === -1 ? 0 : current}
        onChange={(_, v) => navigate(items[v].path)}
        sx={{ height: 56 }}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={item.icon}
            sx={{ minWidth: 64 }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  )
}

export default BottomNav
