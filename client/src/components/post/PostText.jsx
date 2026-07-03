import { memo } from 'react'
import { Link } from 'react-router-dom'

// Renders post text with clickable #hashtags → /tag/x and @mentions → /profile/uid
// mentionMap: { 'name': uid } stored on the post at create time
const PostText = memo(({ text, mentionMap = {} }) => {
  const parts = text.split(/([#@][\w.]+)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).toLowerCase()
          return (
            <Link key={i} to={`/tag/${tag}`} className="text-[#1976d2] font-medium hover:underline">
              {part}
            </Link>
          )
        }
        if (part.startsWith('@')) {
          const uid = mentionMap[part.slice(1).toLowerCase()]
          if (uid) {
            return (
              <Link key={i} to={`/profile/${uid}`} className="text-[#1976d2] font-medium hover:underline">
                {part}
              </Link>
            )
          }
          return part
        }
        return part
      })}
    </>
  )
})

export default PostText
