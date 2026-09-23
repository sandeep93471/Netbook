import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { TextField, Button, Typography, Alert, CircularProgress, InputAdornment, Box } from '@mui/material'
import { PinOutlined } from '@mui/icons-material'
import { sendVerifyCode, verifyEmail } from '../../api/auth'
import { setUser } from '../../redux/slices/authSlice'
import { apiError } from '../../api/client'

const VerifyEmail = () => {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devCode, setDevCode] = useState('')
  const autoSent = useRef(false)

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await sendVerifyCode()
      setSent(true)
      if (data.devCode) setDevCode(data.devCode)
      else if (!data.sent) setError('Email not configured on the server')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSending(false)
    }
  }

  // Send a fresh code when the page opens (register's code may have expired)
  useEffect(() => {
    if (!autoSent.current) {
      autoSent.current = true
      resend()
    }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await verifyEmail(code.trim())
      dispatch(setUser({ ...user, emailVerified: true }))
      navigate('/')
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

        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Verify your email
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We emailed a 6-digit code to <strong>{user?.email}</strong>
        </Typography>

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2, mb: 2 }}>{error}</Alert>}
        {devCode && (
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            Dev mode — no SMTP configured. Your code: <strong style={{ letterSpacing: 4, fontSize: '1.1rem' }}>{devCode}</strong>
          </Alert>
        )}
        {sent && !devCode && <Alert severity="success" sx={{ borderRadius: 2, mb: 2 }}>Code sent — check your inbox</Alert>}

        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            required
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PinOutlined sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
              htmlInput: {
                maxLength: 6,
                inputMode: 'numeric',
                style: { letterSpacing: '8px', fontSize: '1.1rem', fontWeight: 600 },
              },
            }}
          />
          <Button
            fullWidth variant="contained" size="large" type="submit" disabled={loading}
            sx={{ py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 100%)' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
          <Button fullWidth variant="text" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : "Didn't get it? Resend code"}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default VerifyEmail
