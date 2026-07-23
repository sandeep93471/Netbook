import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Paper, Typography, TextField, Button, Avatar, CircularProgress, FormControlLabel, Switch } from '@mui/material'
import { updateUserProfile, fetchUserProfile, selectCurrentProfile } from '../../redux/slices/userSlice'
import { validateProfile } from '../../utils/validation'
import { showError } from '../../utils/errorHandler'

const EditProfile = () => {
  const { user } = useSelector((state) => state.auth)
  const currentProfile = useSelector(selectCurrentProfile)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(currentProfile?.uid === user?.uid ? currentProfile?.bio || '' : '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [preview, setPreview] = useState(user?.photoURL || '')
  const [isPrivate, setIsPrivate] = useState(
    currentProfile?.uid === user?.uid ? !!currentProfile?.isPrivate : false
  )
  const [loading, setLoading] = useState(false)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      setPreview(URL.createObjectURL(file)) // temporary preview
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const error = validateProfile(displayName, bio)
    if (error) { showError({ message: error }); return }
    // Avatars have a 2MB limit in storage.rules
    if (avatarFile) {
      if (avatarFile.size > 2 * 1024 * 1024) { showError({ message: 'Avatar must be less than 2MB' }); return }
      if (!avatarFile.type.startsWith('image/')) { showError({ message: 'Avatar must be an image' }); return }
    }
    setLoading(true)
    await dispatch(updateUserProfile({ uid: user.uid, displayName, bio, avatarFile, isPrivate }))
    await dispatch(fetchUserProfile(user.uid))
    setLoading(false)
    navigate(`/profile/${user.uid}`)
  }

  return (
    <div className="max-w-lg mx-auto mt-8 px-4">
      <Paper elevation={2} className="p-6">
        <Typography variant="h5" className="font-bold mb-6">Edit Profile</Typography>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <label className="cursor-pointer relative group">
              <Avatar src={preview} sx={{ width: 100, height: 100 }} className="ring-2 ring-blue-400">
                {displayName?.charAt(0)}
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <Typography variant="caption" className="text-white">Change</Typography>
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <TextField fullWidth label="Display Name" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} required />

          <TextField fullWidth label="Bio" value={bio}
            onChange={(e) => setBio(e.target.value)} multiline rows={3}
            placeholder="Tell us about yourself..." />

          <FormControlLabel
            control={
              <Switch checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            }
            label={
              <div>
                <Typography variant="body2" className="font-semibold">Private account</Typography>
                <Typography variant="caption" color="text.secondary">
                  Only friends can see your posts, photos and stories. Anyone else sees a locked profile.
                </Typography>
              </div>
            }
          />

          <div className="flex gap-3 justify-end">
            <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="contained" type="submit" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </div>
        </form>
      </Paper>
    </div>
  )
}

export default EditProfile
