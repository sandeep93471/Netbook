import { useDispatch, useSelector } from 'react-redux'
import { Box, Tooltip } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google'
import { loginWithGoogleThunk } from '../../redux/slices/authSlice'
import { showError } from '../../utils/errorHandler'

// Official Google-rendered button → credential goes to our /auth/google endpoint
const GoogleButton = () => {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.auth)
  const configured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!configured) {
    return (
      <Tooltip title="Set VITE_GOOGLE_CLIENT_ID in client/.env to enable">
        <span>
          <Box
            className="w-full flex items-center justify-center rounded-xl border border-[#e2e8f0] text-[#64748b]"
            sx={{ height: 52, opacity: 0.6, cursor: 'not-allowed' }}
          >
            Continue with Google (not configured)
          </Box>
        </span>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ '& > div': { width: '100%' } }}>
      <GoogleLogin
        width="440"
        size="large"
        text="continue_with"
        shape="rectangular"
        onSuccess={(res) => dispatch(loginWithGoogleThunk(res.credential))}
        onError={() => showError({ message: 'Google sign-in failed' })}
        useOneTap={false}
        disabled={loading}
      />
    </Box>
  )
}

export default GoogleButton
