import { Skeleton } from '@mui/material'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/blur.css'

// Lazy-loads images near the viewport, shows a skeleton + blur-up while loading
const OptimizedImage = ({ src, alt = '', className = '', height = 300 }) => (
  <LazyLoadImage
    src={src}
    alt={alt}
    effect="blur"
    className={`w-full object-cover rounded-lg ${className}`}
    style={{ height }}
    wrapperClassName="w-full"
    placeholder={
      <Skeleton variant="rectangular" height={height} className="rounded-lg" />
    }
  />
)

export default OptimizedImage
