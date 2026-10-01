import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Button, InputAdornment, Alert, CircularProgress, Typography } from '@mui/material'
import LockResetIcon from '@mui/icons-material/LockReset'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { changePassword } from '../../api/auth'
import { showSuccess } from '../../utils/errorHandler'

const FIELDS = [
  { key: 'current', label: 'Current password', autoComplete: 'current-password' },
  { key: 'next', label: 'New password', autoComplete: 'new-password' },
  { key: 'confirm', label: 'Confirm new password', autoComplete: 'new-password' },
]

// Logged-in password change — requires the current password (not the reset-code flow).
// Shared by the Settings dialog (sidebar) and Edit Profile page.
const ChangePasswordDialog = ({ open, onClose }) => {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false })
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)

  const close = () => {
    if (saving) return
    setPw({ current: '', next: '', confirm: '' })
    setPwShow({ current: false, next: false, confirm: false })
    setPwError('')
    onClose()
  }

  const submit = async () => {
    if (!pw.current || !pw.next || !pw.confirm) return setPwError('All fields are required')
    if (pw.next.length < 8) return setPwError('New password must be at least 8 characters')
    if (pw.next !== pw.confirm) return setPwError('New passwords do not match')
    setPwError('')
    setSaving(true)
    try {
      await changePassword(pw.current, pw.next)
      showSuccess('Password updated')
      setSaving(false)
      setPw({ current: '', next: '', confirm: '' })
      onClose()
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update password')
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle className="font-bold flex items-center gap-2">
        <LockResetIcon sx={{ color: '#0A5CE0' }} /> Change password
      </DialogTitle>
      <DialogContent dividers>
        {pwError && <Alert severity="error" sx={{ mb: 2 }}>{pwError}</Alert>}
        {FIELDS.map((f, i) => (
          <TextField
            key={f.key}
            fullWidth size="small" label={f.label}
            type={pwShow[f.key] ? 'text' : 'password'}
            value={pw[f.key]}
            onChange={(e) => setPw((p) => ({ ...p, [f.key]: e.target.value }))}
            autoComplete={f.autoComplete}
            autoFocus={i === 0}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setPwShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                    aria-label={pwShow[f.key] ? `Hide ${f.label}` : `Show ${f.label}`}
                    edge="end"
                  >
                    {pwShow[f.key] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        ))}
        <Typography variant="caption" color="text.secondary" className="block">
          Use at least 8 characters. You'll stay logged in on this device.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={submit}
          disabled={saving || !pw.current || !pw.next || !pw.confirm}>
          {saving ? <CircularProgress size={20} /> : 'Update password'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ChangePasswordDialog
