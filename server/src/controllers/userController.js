import User from '../models/User.js'
import FriendRequest from '../models/FriendRequest.js'
import Notification from '../models/Notification.js'
import { emitToUser } from '../socket/index.js'

const shapeUser = (u) => ({
  uid: u._id, displayName: u.displayName, searchName: u.searchName,
  email: u.email, photoURL: u.photoURL, coverURL: u.coverURL, bio: u.bio,
  verified: u.verified, friends: u.friends, followers: u.followers,
  following: u.following, savedPosts: u.savedPosts, isPrivate: u.isPrivate,
  closeFriends: u.closeFriends,
  searchHistory: u.searchHistory, photoHistory: u.photoHistory,
  lastSeen: u.lastSeen, createdAt: u.createdAt,
})

// Private-account visibility: only friends can view (follow feature removed)
const canViewProfile = (viewer, target) => {
  const tid = target._id.toString()
  const vid = viewer._id.toString()
  if (tid === vid || !target.isPrivate) return true
  return target.friends.some((f) => f.toString() === vid)
}

// GET /api/users/:id
export const getUser = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash -refreshTokenHash -verifyCode -resetCode')
  if (!user) return res.status(404).json({ message: 'User not found' })
  const shaped = shapeUser(user)
  shaped.canView = canViewProfile(req.user, user)
  if (!shaped.canView) { shaped.photoHistory = []; shaped.savedPosts = [] }
  res.json({ user: shaped })
}

// PATCH /api/users/me — displayName/bio/photoURL/coverURL/isPrivate
export const updateMe = async (req, res) => {
  const { displayName, bio, photoURL, coverURL, isPrivate } = req.body
  const user = req.user
  const historyAdds = []
  if (isPrivate !== undefined) user.isPrivate = !!isPrivate
  if (displayName !== undefined) {
    user.displayName = displayName
    user.searchName = displayName.toLowerCase()
    user.bio = bio
  }
  if (photoURL) { user.photoURL = photoURL; historyAdds.push({ url: photoURL, type: 'avatar', at: Date.now() }) }
  if (coverURL) { user.coverURL = coverURL; historyAdds.push({ url: coverURL, type: 'cover', at: Date.now() }) }
  user.photoHistory.push(...historyAdds)
  await user.save()
  res.json({ user: shapeUser(user) })
}



// PUT /api/users/me/close-friends/:id — toggle friend in/out of Close Friends list
export const toggleCloseFriend = async (req, res) => {
  const user = req.user
  const fid = req.params.id
  const isFriend = user.friends.some((f) => f.toString() === fid)
  if (!isFriend) return res.status(400).json({ message: 'Close friends must be friends first' })
  const has = user.closeFriends.some((f) => f.toString() === fid)
  user.closeFriends = has
    ? user.closeFriends.filter((f) => f.toString() !== fid)
    : [...user.closeFriends, fid]
  await user.save()
  res.json({ closeFriends: user.closeFriends, added: !has })
}

// PUT /api/users/me/saved/:postId — toggle bookmark
export const toggleSaved = async (req, res) => {
  const user = req.user
  const pid = req.params.postId
  const has = user.savedPosts.some((p) => p.toString() === pid)
  user.savedPosts = has
    ? user.savedPosts.filter((p) => p.toString() !== pid)
    : [...user.savedPosts, pid]
  await user.save()
  res.json({ savedPosts: user.savedPosts, saved: !has })
}

// GET /api/users/search?q= — prefix match on searchName
export const searchUsers = async (req, res) => {
  const term = (req.query.q || '').toLowerCase().trim()
  if (!term) return res.json({ users: [] })
  const users = await User.find({ searchName: new RegExp(`^${term}`, 'i') })
    .select('displayName searchName photoURL bio')
    .limit(20)
    .lean()
  res.json({ users: users.map((u) => ({ uid: u._id, ...u })) })
}

// GET /api/users/suggested — people I'm not friends with yet
export const suggestedUsers = async (req, res) => {
  const me = req.user
  const users = await User.find({ _id: { $ne: me._id } })
    .select('displayName photoURL bio friends')
    .limit(10)
    .lean()
  const myFriends = (me.friends || []).map((f) => f.toString())
  res.json({
    users: users
      .filter((u) => !myFriends.includes(u._id.toString()))
      .map((u) => ({ uid: u._id, displayName: u.displayName, photoURL: u.photoURL, bio: u.bio })),
  })
}

// GET /api/users/:id/basic — name+photo only (for chat pickers etc)
export const basicUsers = async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean)
  const users = await User.find({ _id: { $in: ids } })
    .select('displayName photoURL lastSeen').lean()
  res.json({ users: users.map((u) => ({ uid: u._id, displayName: u.displayName, photoURL: u.photoURL, lastSeen: u.lastSeen })) })
}

// POST /api/users/me/search-history { term }
export const recordSearch = async (req, res) => {
  const user = req.user
  const term = req.body.term?.trim()
  if (!term) return res.json({ searchHistory: user.searchHistory })
  user.searchHistory = [
    { term, at: Date.now() },
    ...user.searchHistory.filter((h) => h.term !== term),
  ].slice(0, 10)
  await user.save()
  res.json({ searchHistory: user.searchHistory })
}

// DELETE /api/users/me/search-history/:term — remove one entry
export const removeSearch = async (req, res) => {
  const user = req.user
  user.searchHistory = user.searchHistory.filter((h) => h.term !== req.params.term)
  await user.save()
  res.json({ searchHistory: user.searchHistory })
}

// PUT /api/users/me/fcm { token } — register a push token (deduped)
export const addFcmToken = async (req, res) => {
  const user = req.user
  if (req.body.token && !user.fcmTokens.includes(req.body.token)) {
    user.fcmTokens.push(req.body.token)
    await user.save()
  }
  res.json({ ok: true })
}

// GET /api/users/me/status/:id — online status for chat header
export const userStatus = async (req, res) => {
  const { isOnline } = await import('../socket/index.js')
  const user = await User.findById(req.params.id).select('lastSeen')
  if (!user) return res.status(404).json({ message: 'Not found' })
  res.json({ status: isOnline(req.params.id) ? 'online' : 'offline', lastSeen: user.lastSeen })
}
