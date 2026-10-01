// Feed ranking — the student-scale version of Meta's 4-stage pipeline:
//   inventory → signals → predictions → score+diversify.
// We score with three signal groups:
//   recency    — exponential decay, ~half-life of one day
//   engagement — log-scaled comments/reactors/shares (log prevents viral
//                posts from permanently pinning the top)
//   affinity   — viewer's relationship to the author (close friend > friend
//                > followed > stranger), mirroring FB's "who posted" signal
// Then a diversification pass caps consecutive posts by the same author.

export const FEED_POOL_SIZE = 150 // candidate inventory per request

const HALF_LIFE_H = 24

export const scorePost = (post, viewer, now = Date.now()) => {
  const ageH = Math.max(0, (now - new Date(post.createdAt).getTime()) / 3.6e6)
  const recency = 10 * Math.pow(0.5, ageH / HALF_LIFE_H)

  const reactors = post.reactions ? Object.keys(post.reactions).length : 0
  const engagement =
    3 * Math.log1p(post.commentCount || 0) +
    2 * Math.log1p(reactors) +
    4 * Math.log1p(post.shareCount || 0) +
    (post.imageURL || post.videoURL ? 0.5 : 0)

  const vid = viewer._id.toString()
  const aid = post.user?.toString()
  const inList = (list) => (list || []).some((id) => id.toString() === aid)
  const affinity = aid === vid ? 0.5
    : inList(viewer.closeFriends) ? 6
    : inList(viewer.friends) ? 4
    : inList(viewer.following) ? 2.5
    : 0

  return recency + engagement + affinity
}

// No more than two posts in a row from the same author (FB-style diversity)
const diversify = (scored) => {
  const out = []
  const deferred = []
  for (const item of scored) {
    const aid = item.post.user?.toString()
    const last2 = out.slice(-2)
    if (last2.length === 2 && last2.every((x) => x.post.user?.toString() === aid)) {
      deferred.push(item)
      continue
    }
    out.push(item)
  }
  return [...out, ...deferred]
}

// Returns posts in ranked order (highest score first)
export const rankPosts = (posts, viewer, now = Date.now()) => {
  const scored = posts.map((post) => ({ post, score: scorePost(post, viewer, now) }))
  scored.sort((a, b) =>
    b.score - a.score ||
    new Date(b.post.createdAt) - new Date(a.post.createdAt) ||
    b.post._id.toString().localeCompare(a.post._id.toString()))
  return diversify(scored).map((s) => s.post)
}
