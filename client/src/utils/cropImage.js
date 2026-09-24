const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// Draws the cropped (and optionally rotated) region to a canvas → Blob.
// Rotation is rendered into a bounding-box canvas first, then the crop
// region (which react-easy-crop reports in rotated-image space) is copied out.
export const getCroppedBlob = async (imageSrc, pixelCrop, rotation = 0) => {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (rotation !== 0) {
    // Draw the rotated image into its bounding box
    const rad = (rotation * Math.PI) / 180
    const bW = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height)
    const bH = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height)
    canvas.width = bW
    canvas.height = bH
    ctx.translate(bW / 2, bH / 2)
    ctx.rotate(rad)
    ctx.drawImage(image, -image.width / 2, -image.height / 2)
    // Extract the crop region into a second canvas
    const out = document.createElement('canvas')
    out.width = pixelCrop.width
    out.height = pixelCrop.height
    out.getContext('2d').drawImage(
      canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, pixelCrop.width, pixelCrop.height
    )
    return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9))
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}
