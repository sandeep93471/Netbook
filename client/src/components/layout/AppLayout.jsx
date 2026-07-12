import { Suspense, useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { AnimatePresence } from 'framer-motion'
import { CircularProgress, Alert, Button } from '@mui/material'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import RightRail from './RightRail'
import BottomNav from './BottomNav'
import PageTransition from '../common/PageTransition'
import ErrorBoundary from '../common/ErrorBoundary'
import { useNotifications } from '../../hooks/useNotifications'
import { usePresence } from '../../hooks/usePresence'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../../api/socket'
import { refreshFriends } from '../../redux/slices/friendSlice'

// Warns unverified users — links to the code entry page
const VerifyEmailBanner = () => {
  const { user } = useSelector((state) => state.auth)
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (!user || user.emailVerified !== false || dismissed) return null

  return (
    <Alert
      severity="warning"
      onClose={() => setDismissed(true)}
      action={
        <Button color="inherit" size="small" onClick={() => navigate('/verify-email')}>
          Verify
        </Button>
      }
      sx={{ borderRadius: 0 }}
    >
      Verify your email address to secure your account.
    </Alert>
  )
}

const AppLayout = () => {
  useNotifications() // real-time listener, active on every authenticated page
  usePresence() // mark user online/offline
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  // Friend graph changes on another device/session — resync requests + friends
  useEffect(() => {
    if (!user?.uid) return
    const s = getSocket()
    const refresh = () => dispatch(refreshFriends())
    s.on('friend:accepted', refresh)
    return () => s.off('friend:accepted', refresh)
  }, [dispatch, user?.uid])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#18191A]">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <VerifyEmailBanner />
      <div className="flex max-w-[1280px] mx-auto gap-6 px-2">
        <aside className="w-64 hidden md:block shrink-0 sticky top-[72px] self-start max-h-[calc(100dvh-88px)] overflow-y-auto">
          <Sidebar />
        </aside>
        <main id="main-content" className="flex-1 min-w-0 p-4 pb-20 md:pb-4" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {/* Suspense inside PageTransition: exit animation still plays
                  while the next page's chunk downloads */}
              <Suspense fallback={<div className="flex justify-center py-20"><CircularProgress /></div>}>
                {/* Per-page boundary: a crashed page shows error UI but
                    navbar/sidebar stay usable */}
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </Suspense>
            </PageTransition>
          </AnimatePresence>
        </main>
        {/* Right rail — suggestions on large screens; hidden on chat (needs the width) */}
        {!location.pathname.startsWith('/chat') && (
          <aside className="w-80 hidden lg:block shrink-0 sticky top-[72px] self-start max-h-[calc(100dvh-88px)] overflow-y-auto">
            <RightRail />
          </aside>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default AppLayout
