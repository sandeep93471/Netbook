import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Snackbar, Alert, CircularProgress } from '@mui/material'
import { useAuthListener } from './hooks/useAuthListener'
import { useFCM } from './hooks/useFCM'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Code splitting: each page becomes its own chunk, downloaded on-demand
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'))
const Terms = lazy(() => import('./pages/auth/Terms'))
const Privacy = lazy(() => import('./pages/auth/Privacy'))
const Feed = lazy(() => import('./pages/home/Feed'))
const Explore = lazy(() => import('./pages/home/Explore'))
const Profile = lazy(() => import('./pages/profile/Profile'))
const EditProfile = lazy(() => import('./pages/profile/EditProfile'))
const ChatRoom = lazy(() => import('./pages/chat/ChatRoom'))
const Notifications = lazy(() => import('./pages/home/Notifications'))
const PostDetail = lazy(() => import('./pages/home/PostDetail'))
const Saved = lazy(() => import('./pages/home/Saved'))
const Friends = lazy(() => import('./pages/home/Friends'))
const TagFeed = lazy(() => import('./pages/home/TagFeed'))
const Reels = lazy(() => import('./pages/home/Reels'))

const PageLoading = () => (
  <div className="flex justify-center py-20"><CircularProgress /></div>
)

function App() {
  useAuthListener()
  useNetworkStatus()
  const { foregroundNotification, clearNotification } = useFCM()

  return (
    <>
    <ErrorBoundary>
    <Routes>
      {/* Auth pages (no layout) — own Suspense since they're outside AppLayout */}
      <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoading />}><Register /></Suspense>} />
      <Route path="/forgot-password" element={<Suspense fallback={<PageLoading />}><ForgotPassword /></Suspense>} />
      <Route path="/terms" element={<Suspense fallback={<PageLoading />}><Terms /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<PageLoading />}><Privacy /></Suspense>} />

      {/* App pages (with Navbar/Sidebar/BottomNav) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Feed />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/chat" element={<ChatRoom />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/post/:postId" element={<PostDetail />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/tag/:tag" element={<TagFeed />} />
        <Route path="/reels" element={<Reels />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>

    {/* Foreground push notification toast */}
    <Snackbar
      open={!!foregroundNotification}
      autoHideDuration={5000}
      onClose={clearNotification}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert severity="info" onClose={clearNotification}>
        <strong>{foregroundNotification?.title}</strong>: {foregroundNotification?.body}
      </Alert>
    </Snackbar>
    </>
  )
}

export default App