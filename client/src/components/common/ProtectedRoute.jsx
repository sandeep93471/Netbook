import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CircularProgress, Box, Typography } from '@mui/material'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
  const location = useLocation()

  // Wait for the session check (/me) — on cold-start hosts this can take
  // ~30s; redirecting early would bounce logged-in users to /login.
  if (loading) {
    return (
      <Box className="min-h-screen flex flex-col items-center justify-center gap-4">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Checking your session…
        </Typography>
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
