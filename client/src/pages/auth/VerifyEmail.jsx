import { useState } from 'react'
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

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      const { data } = await sendVerifyCode()
      setSent(true)
      if (!data.sent) setError('Email not configured on the server — check server logs for the code')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setSending(false)
    }
  }

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

        <Typography variant="h4" className="font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-1">
          Verify your email
        </Typography>
        <Typography variant="body2" className="text-[#64748b] mb-6">
          We emailed a 6-digit code to {user?.email}
        </Typography>

        {error && <Alert severity="error" className="mb-5" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>}
        {sent && <Alert severity="success" className="mb-5" sx={{ borderRadius: 2 }}>Code sent — check your inbox</Alert>}

        <form onSubmit={submit} className="space-y-4">
          <TextField
            fullWidth label="6-digit code" value={code}
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
          <Button
            fullWidth variant="contained" size="large" type="submit" disabled={loading}
            sx={{ py: 1.5, fontSize: '1rem', background: 'linear-gradient(135deg, #0A5CE0 0%, #0847B8 100%)' }}
          >
            {loading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
          <Button fullWidth variant="text" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : "Didn't get it? Resend code"}
          </Button>
        </form>
      </Box>
    </Box>
  )
}

export default VerifyEmail
