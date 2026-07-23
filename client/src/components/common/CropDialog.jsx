import { useState, useCallback } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Slider, Typography } from '@mui/material'
import Cropper from 'react-easy-crop'
import { getCroppedBlob } from '../../utils/cropImage'

// Reusable crop dialog — aspect 1 for avatars, ~16/5 for covers
const CropDialog = ({ open, imageSrc, aspect = 1, title, onCancel, onDone }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedArea(areaPixels)
  }, [])

  const handleDone = async () => {
    setBusy(true)
    const blob = await getCroppedBlob(imageSrc, croppedArea)
    setBusy(false)
    onDone(new File([blob], 'crop.jpg', { type: 'image/jpeg' }))
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <Typography variant="caption" color="text.secondary" className="block mt-3 mb-1">
          Zoom
        </Typography>
        <Slider
          value={zoom}
          min={1}
          max={3}
          step={0.05}
          onChange={(_, v) => setZoom(v)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleDone} disabled={busy || !croppedArea}>
          {busy ? 'Cropping...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CropDialog
