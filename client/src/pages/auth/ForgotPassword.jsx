import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Box,
} from '@mui/material'
import { Email, PinOutlined, LockOutlined } from '@mui/icons-material'
import { resetPassword, confirmReset } from '../../api/auth'
import { apiError } from '../../api/client'

// Two-step reset: email → 6-digit code + new password
const ForgotPassword = () => {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const sendCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setStep(2)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  const doReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmReset(email, code.trim(), password)
      setDone(true)
    } catch (err) {
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="min-h-screen flex items-center justify-center px-6 bg-[#fafafa] dark:bg-[#0f172a]">
      <Box className="w-full max-w-[440px]">
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0A5CE0, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em',
            mb: 4,
          }}
        >
          Netbook
        </Typography>

        <Typography variant="h4" className="font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-1">
          Reset password
        </Typography>
        <Typography variant="body2" className="text-[#64748b] mb-6">
          {step === 1
            ? "Enter your email and we'll send you a 6-digit code"
            : `We sent a code to ${email}`}
        </Typography>

        {error && (
          <Alert severity="error" className="mb-5" onClose={() => setError('')} sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {done ? (
          <Alert severity="success" className="mb-5" sx={{ borderRadius: 2 }}>
            Password updated! You can sign in now.
          </Alert>
        ) : step === 1 ? (
          <form onSubmit={sendCode} className="space-y-4">
            <TextField
              fullWidth
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              fullWidth variant="contained" size="large" type="submit" disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 100%)' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={doReset} className="space-y-4">
            <TextField
              fullWidth
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PinOutlined sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              fullWidth variant="contained" size="large" type="submit" disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 100%)' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Reset Password'}
            </Button>
          </form>
        )}

        <Typography variant="body2" className="text-center mt-6 text-[#64748b]">
          Remembered it?{' '}
          <Link to="/login" className="text-[#0A5CE0] font-semibold hover:underline">
            Back to sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  )
}

export default ForgotPassword
