// Handles every timestamp shape we store:
//   number (ms epoch)  — messages, stories
//   ISO string         — MongoDB documents (posts, comments, notifications)
//   Date / Firestore { seconds } — legacy shapes
const toMs = (ts) => {
  if (!ts) return 0
  if (typeof ts === 'number') return ts
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'string') return new Date(ts).getTime()
  if (typeof ts === 'object' && 'seconds' in ts) return ts.seconds * 1000 // Firestore
  return 0
}

export const timeAgo = (timestamp) => {
  const ms = toMs(timestamp)
  if (!ms) return ''
  const diff = Date.now() - ms
  if (diff < 0) return 'just now' // clock skew guard
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
