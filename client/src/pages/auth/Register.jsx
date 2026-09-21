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
  MenuItem,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  People,
  ChatBubble,
  PhotoCamera,
  Groups,
  ErrorOutlined,
} from '@mui/icons-material'
import { registerUser, clearError } from '../../redux/slices/authSlice'
import GoogleButton from '../../components/auth/GoogleButton'

// ── Design tokens (shared with Login) ──────────────────────────────
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

const LogoMark = () => (
  <Box
    sx={{
      width: 44,
      height: 44,
      borderRadius: 2.5,
      background: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Groups sx={{ color: '#fff', fontSize: 26 }} />
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

const FieldError = ({ children }) => (
  <Box component="span" className="flex items-center gap-1" sx={{ color: ERROR_RED }}>
    <ErrorOutlined sx={{ fontSize: 14 }} /> {children}
  </Box>
)

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const dispatch = useDispatch()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setFieldErrors({ ...fieldErrors, [e.target.name]: '' })
  }

  const validate = () => {
    const errors = {}
    if (!formData.displayName.trim()) errors.displayName = 'Full name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!EMAIL_RE.test(formData.email)) errors.email = 'Enter a valid email address'
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters'
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (!agreeTerms) errors.terms = 'Please agree to the Terms of Service'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(registerUser({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName,
      dob: formData.dob || undefined,
      gender: formData.gender || undefined,
    }))
  }

  const eyeButton = (show, setShow) => (
    <IconButton
      onClick={() => setShow(!show)}
      edge="end"
      size="small"
      aria-label={show ? 'Hide password' : 'Show password'}
      sx={{ minWidth: 44, minHeight: 44 }}
    >
      {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
    </IconButton>
  )

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
            Connect with friends and the world around you
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 400, lineHeight: 1.8, mt: '16px' }}
          >
            Join Netbook to share moments, chat with friends, and discover communities that matter to you.
          </Typography>

          <Box sx={{ mt: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <FeatureItem icon={<People sx={{ color: '#fff', fontSize: 20 }} />} text="Connect with people worldwide" />
            <FeatureItem icon={<ChatBubble sx={{ color: '#fff', fontSize: 20 }} />} text="Real-time messaging and group chats" />
            <FeatureItem icon={<PhotoCamera sx={{ color: '#fff', fontSize: 20 }} />} text="Share your stories and memories" />
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
            Create your account
          </Typography>
          <Typography sx={{ fontSize: 15, color: '#667085', mb: '24px' }}>
            Start your journey with Netbook today
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
                label="Full Name"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                autoFocus
                autoComplete="name"
                error={!!fieldErrors.displayName}
                helperText={fieldErrors.displayName && <FieldError>{fieldErrors.displayName}</FieldError>}
                sx={FIELD_SX}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                error={!!fieldErrors.email}
                helperText={fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
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
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                error={!!fieldErrors.password}
                helperText={
                  fieldErrors.password
                    ? <FieldError>{fieldErrors.password}</FieldError>
                    : 'Must be at least 6 characters'
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
                        {eyeButton(showPassword, setShowPassword)}
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                error={!!fieldErrors.confirmPassword}
                helperText={fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
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
                        {eyeButton(showConfirmPassword, setShowConfirmPassword)}
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* DOB + gender — optional, Facebook-style */}
              <Box className="flex gap-3">
                <TextField
                  fullWidth
                  label="Date of birth"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={FIELD_SX}
                />
                <TextField
                  fullWidth
                  select
                  label="Gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  sx={FIELD_SX}
                  slotProps={{ inputLabel: { shrink: true } }}
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  size="small"
                  sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#0A5CE0' } }}
                />
              }
              label={
                <Typography variant="body2" className="text-[#64748b]">
                  I agree to the{' '}
                  <Link to="/terms" className="text-[#0A5CE0] hover:underline font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-[#0A5CE0] hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </Typography>
              }
              sx={{ mt: '12px' }}
            />
            {fieldErrors.terms && (
              <Typography variant="caption" sx={{ color: ERROR_RED, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <ErrorOutlined sx={{ fontSize: 14 }} /> {fieldErrors.terms}
              </Typography>
            )}

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
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
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
            Already have an account?{' '}
            <Link to="/login" className="text-[#0A5CE0] font-semibold hover:underline">
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default Register
