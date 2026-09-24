import { useState, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogActions, Button, Slider, Typography,
  IconButton, Tooltip, Box,
} from '@mui/material'
import Cropper from 'react-easy-crop'
import { getCroppedBlob } from '../../utils/cropImage'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'

// Reusable crop dialog — circular crop for avatars, wide crop for covers.
// Rotate, zoom, drag-to-position; dark editor surface like modern editors.
const CropDialog = ({ open, imageSrc, aspect = 1, title, onCancel, onDone }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedArea, setCroppedArea] = useState(null)
  const [busy, setBusy] = useState(false)

  const isAvatar = aspect === 1

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedArea(areaPixels)
  }, [])

  const handleDone = async () => {
    setBusy(true)
    const blob = await getCroppedBlob(imageSrc, croppedArea, rotation)
    setBusy(false)
    onDone(new File([blob], 'crop.jpg', { type: 'image/jpeg' }))
  }

  const rotate = (deg) => setRotation((r) => (r + deg + 360) % 360)

  return (
    <Dialog
      open={open} onClose={onCancel} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <Typography variant="h6" className="font-bold">{title}</Typography>
        <IconButton size="small" onClick={onCancel} aria-label="Close editor">
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>

      <DialogContent className="px-5">
        {/* Editor surface */}
        <Box
          className="relative w-full h-80 rounded-2xl overflow-hidden"
          sx={{ bgcolor: '#0b0b0f' }}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={isAvatar ? 'round' : 'rect'}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </Box>

        <Typography
          variant="caption" color="text.secondary"
          className="block text-center mt-3"
        >
          Drag to reposition · scroll or pinch to zoom{!isAvatar && ' · rotate to straighten'}
        </Typography>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-4">
          <Tooltip title="Rotate left">
            <IconButton size="small" onClick={() => rotate(-90)} aria-label="Rotate left">
              <RotateLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rotate right">
            <IconButton size="small" onClick={() => rotate(90)} aria-label="Rotate right">
              <RotateRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <Tooltip title="Zoom out">
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(1, z - 0.2))} aria-label="Zoom out">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Slider
            value={zoom}
            min={1}
            max={4}
            step={0.02}
            onChange={(_, v) => setZoom(v)}
            sx={{ flex: 1 }}
            aria-label="Zoom"
          />
          <Tooltip title="Zoom in">
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(4, z + 0.2))} aria-label="Zoom in">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </DialogContent>

      <DialogActions className="px-5 pb-4">
        <Button onClick={onCancel} sx={{ borderRadius: 999 }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleDone} disabled={busy || !croppedArea}
          startIcon={<CheckIcon />}
          sx={{ borderRadius: 999, px: 3 }}
        >
          {busy ? 'Applying…' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CropDialog
