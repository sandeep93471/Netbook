// Client-side validation — returns an error string, or null if valid.
// Security rules enforce the same limits server-side; this is for UX.

export const validatePost = (text, imageFile, videoFile = null) => {
  if (!text?.trim() && !imageFile && !videoFile) {
    return 'Post must have text, an image, or a video'
  }
  if (text && text.length > 5000) {
    return 'Post is too long (max 5000 characters)'
  }
  if (imageFile) {
    if (imageFile.size > 5 * 1024 * 1024) return 'Image must be less than 5MB'
    if (!imageFile.type.startsWith('image/')) return 'File must be an image'
  }
  if (videoFile) {
    if (videoFile.size > 50 * 1024 * 1024) return 'Video must be less than 50MB'
    if (!videoFile.type.startsWith('video/')) return 'File must be a video'
  }
  return null
}

export const validateComment = (text) => {
  if (!text?.trim()) return 'Comment cannot be empty'
  if (text.length > 1000) return 'Comment is too long (max 1000 characters)'
  return null
}

export const validateMessage = (text) => {
  if (!text?.trim()) return 'Message cannot be empty'
  if (text.length > 5000) return 'Message is too long (max 5000 characters)'
  return null
}

export const validateProfile = (displayName, bio) => {
  if (!displayName?.trim()) return 'Display name is required'
  if (displayName.length > 50) return 'Display name too long'
  if (bio && bio.length > 200) return 'Bio too long (max 200 characters)'
  return null
}
