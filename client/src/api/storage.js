// Cloudinary unsigned upload — files go straight to Cloudinary, URL is stored.
// Requires VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET in .env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const uploadImage = async (file, folder) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env'
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  if (folder) formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Image upload failed')

  const data = await res.json()
  return data.secure_url
}

// Video upload — Cloudinary's video endpoint (unsigned presets allow it by default)
export const uploadVideo = async (file, folder = 'reels') => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env')
  }
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Video upload failed')
  }
  const data = await res.json()
  return data.secure_url
}
