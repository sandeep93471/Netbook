import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, Navigate } from 'react-router-dom'
import {
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Box,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Newspaper,
  Notifications,
  People,
  Groups,
  ErrorOutlined,
} from '@mui/icons-material'
import { loginUser, clearError } from '../../redux/slices/authSlice'
import GoogleButton from '../../components/auth/GoogleButton'

// ── Design tokens (reuse on Register / ForgotPassword) ─────────────
const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    '& .MuiOutlinedInput-input': { padding: '16.5px 14px' }, // 56px height
    '& fieldset': { borderColor: '#D0D5DD', borderWidth: 1 },
    '&:hover fieldset': { borderColor: '#98A2B3' },
    '&.Mui-focused fieldset': {
      borderColor: '#0A5CE0',
      borderWidth: 2,
      boxShadow: '0 0 0 4px rgba(25,118,210,0.12)',
    },
  },
}
const ERROR_RED = '#D92D20'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LogoMark = ({ size = 44 }) => (
  <Box
    sx={{
      width: size,
      height: size,
      borderRadius: 2.5,
      background: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Groups sx={{ color: '#fff', fontSize: size * 0.6 }} />
  </Box>
)

const FeatureItem = ({ icon, text }) => (
  <Box className="flex items-center" sx={{ gap: '20px' }}>
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
      {text}
    </Typography>
  </Box>
)

const Login = () => {
  const remembered = localStorage.getItem('netbook_remember_email') || ''
  const [email, setEmail] = useState(remembered)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(!!remembered)
  const [fieldErrors, setFieldErrors] = useState({})

  const dispatch = useDispatch()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)

  if (isAuthenticated) return <Navigate to="/" replace />

  const validate = () => {
    const errors = {}
    if (!email.trim()) errors.email = 'Email is required'
    else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address'
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (rememberMe) localStorage.setItem('netbook_remember_email', email)
    else localStorage.removeItem('netbook_remember_email')
    dispatch(loginUser({ email, password }))
  }

  return (
    <Box className="min-h-dvh flex">
      {/* Left Panel - Branding */}
      <Box
        className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative overflow-hidden"
        sx={{
          background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 50%, #7c3aed 100%)',
        }}
      >
        {/* Decorative Elements */}
        <Box
          className="absolute inset-0"
          sx={{ background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)' }}
        />
        <Box
          className="absolute inset-0"
          sx={{ background: 'radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.3) 0%, transparent 50%)' }}
        />
        <Box
          className="absolute"
          sx={{ width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: '10%', left: '-10%' }}
        />
        <Box
          className="absolute"
          sx={{ width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', bottom: '20%', right: '-5%' }}
        />
        <Box
          className="absolute"
          sx={{ width: 150, height: 150, borderRadius: '30%', background: 'rgba(255,255,255,0.06)', top: '50%', left: '60%', transform: 'rotate(45deg)' }}
        />

        {/* Content — logo → 64px → headline → 16px → text → 32px → features */}
        <Box className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full animate-fade-in">
          <Box className="flex items-center gap-3">
            <LogoMark />
            <Typography
              variant="h2"
              className="text-white font-bold"
              sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}
            >
              Netbook
            </Typography>
          </Box>

          <Typography
            variant="h3"
            className="text-white"
            sx={{ fontWeight: 700, lineHeight: 1.3, mt: '64px' }}
          >
            Welcome back to your community
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 400, lineHeight: 1.8, mt: '16px' }}
          >
            Sign in to catch up with friends, share updates, and stay connected with the people who matter most.
          </Typography>

          <Box sx={{ mt: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FeatureItem icon={<Newspaper sx={{ color: '#fff', fontSize: 20 }} />} text="Your personalized news feed" />
            <FeatureItem icon={<Notifications sx={{ color: '#fff', fontSize: 20 }} />} text="Real-time notifications" />
            <FeatureItem icon={<People sx={{ color: '#fff', fontSize: 20 }} />} text="Join groups and communities" />
          </Box>
        </Box>
      </Box>

      {/* Right Panel - Form
          Mobile (<lg): full-page gradient + white card.
          Desktop (lg+): tinted panel, no card. */}
      <Box
        className="flex-1 flex items-center justify-center py-10"
        sx={{
          minHeight: '100dvh',
          pl: 'max(24px, env(safe-area-inset-left))',
          pr: 'max(24px, env(safe-area-inset-right))',
          pb: 'max(40px, env(safe-area-inset-bottom))',
          background: {
            xs: 'linear-gradient(160deg, #0A5CE0 0%, #0847B8 45%, #7c3aed 100%)',
            lg: '#F7F8FA',
          },
        }}
      >
        <Box
          className="w-full max-w-[440px]"
          sx={{
            backgroundColor: { xs: '#ffffff', lg: 'transparent' },
            borderRadius: { xs: '24px', lg: 0 },
            p: { xs: '32px 24px', lg: 0 },
            boxShadow: { xs: '0 20px 50px rgba(15,23,42,0.25)', lg: 'none' },
          }}
        >
          {/* Mobile Logo — inside the card */}
          <Box className="lg:hidden mb-6 flex items-center justify-center gap-3">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #0A5CE0, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Groups sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #0A5CE0, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}
            >
              Netbook
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }} className="mb-1">
            Sign in
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#667085', mb: '24px' }}>
            Enter your credentials to access your account
          </Typography>

          {error && (
            <Alert
              severity="error"
              className="mb-5"
              onClose={() => dispatch(clearError())}
              sx={{ borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField
                fullWidth
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                error={!!fieldErrors.email}
                helperText={
                  fieldErrors.email && (
                    <Box component="span" className="flex items-center gap-1" sx={{ color: ERROR_RED }}>
                      <ErrorOutlined sx={{ fontSize: 14 }} /> {fieldErrors.email}
                    </Box>
                  )
                }
                sx={FIELD_SX}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { inputMode: 'email' },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                error={!!fieldErrors.password}
                helperText={
                  fieldErrors.password && (
                    <Box component="span" className="flex items-center gap-1" sx={{ color: ERROR_RED }}>
                      <ErrorOutlined sx={{ fontSize: 14 }} /> {fieldErrors.password}
                    </Box>
                  )
                }
                sx={FIELD_SX}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          sx={{ minWidth: 44, minHeight: 44 }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box className="flex items-center justify-between" sx={{ mt: '12px' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    size="small"
                    sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#0A5CE0' } }}
                  />
                }
                label={<Typography variant="body2" className="text-[#475467]">Remember me</Typography>}
              />
              <Link
                to="/forgot-password"
                className="text-[#0A5CE0] text-sm font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{
                mt: '16px',
                height: 52,
                borderRadius: '12px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #0847B8 0%, #0847B8 100%)' },
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </form>

          <Divider
            sx={{
              my: '24px',
              color: '#98A2B3',
              fontSize: '0.8rem',
              '&::before, &::after': { borderColor: '#D0D5DD' },
            }}
          >
            OR
          </Divider>

          <GoogleButton />

          <Typography variant="body2" className="text-center text-[#64748b]" sx={{ mt: '24px' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-[#0A5CE0] font-semibold hover:underline">
              Create account
            </Link>
          </Typography>

          <Typography variant="caption" className="text-center text-[#98a2b3] block" sx={{ mt: '24px' }}>
            By continuing you agree to our{' '}
            <Link to="/terms" className="text-[#64748b] hover:underline">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-[#64748b] hover:underline">Privacy Policy</Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default Login
