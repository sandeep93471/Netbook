import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Snackbar, Alert, CircularProgress } from '@mui/material'
import { useAuthListener } from './hooks/useAuthListener'
import { useFCM } from './hooks/useFCM'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'

// Code splitting: each page becomes its own chunk, downloaded on-demand.
// lazyWithRetry: if a chunk is gone because a deploy landed while the app was
// open (the white-page bug), reload once to fetch the fresh build — React
// swallows lazy() rejections before window.unhandledrejection can see them,
// so the retry must live inside the importer itself.
const lazyWithRetry = (importer) => lazy(async () => {
  try {
    const mod = await importer()
    sessionStorage.removeItem('lazy-reload')
    return mod
  } catch (err) {
    if (!sessionStorage.getItem('lazy-reload')) {
      sessionStorage.setItem('lazy-reload', '1')
      window.location.reload()
      return new Promise(() => {}) // hold until reload
    }
    throw err
  }
})

const Login = lazyWithRetry(() => import('./pages/auth/Login'))
const Register = lazyWithRetry(() => import('./pages/auth/Register'))
const ForgotPassword = lazyWithRetry(() => import('./pages/auth/ForgotPassword'))
const VerifyEmail = lazyWithRetry(() => import('./pages/auth/VerifyEmail'))
const Terms = lazyWithRetry(() => import('./pages/auth/Terms'))
const Privacy = lazyWithRetry(() => import('./pages/auth/Privacy'))
const Feed = lazyWithRetry(() => import('./pages/home/Feed'))
const Explore = lazyWithRetry(() => import('./pages/home/Explore'))
const Profile = lazyWithRetry(() => import('./pages/profile/Profile'))
const EditProfile = lazyWithRetry(() => import('./pages/profile/EditProfile'))
const ChatRoom = lazyWithRetry(() => import('./pages/chat/ChatRoom'))
const Notifications = lazyWithRetry(() => import('./pages/home/Notifications'))
const PostDetail = lazyWithRetry(() => import('./pages/home/PostDetail'))
const Saved = lazyWithRetry(() => import('./pages/home/Saved'))
const Friends = lazyWithRetry(() => import('./pages/home/Friends'))
const TagFeed = lazyWithRetry(() => import('./pages/home/TagFeed'))
const Reels = lazyWithRetry(() => import('./pages/home/Reels'))

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