import FriendRequest from '../models/FriendRequest.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { emitToUser } from '../socket/index.js'

// GET /api/friends — my requests (received + sent) and friends list
export const getFriends = async (req, res) => {
  const uid = req.user._id
  const [received, sent, me] = await Promise.all([
    FriendRequest.find({ to: uid, status: 'pending' }).populate('from', 'displayName photoURL').lean(),
    FriendRequest.find({ from: uid, status: 'pending' }).populate('to', 'displayName photoURL').lean(),
    User.findById(uid).populate('friends', 'displayName photoURL').lean(),
  ])
  res.json({
    received: received.map((r) => ({ id: r._id, type: r.type, from: { uid: r.from._id, displayName: r.from.displayName, photoURL: r.from.photoURL }, createdAt: r.createdAt })),
    sent: sent.map((r) => ({ id: r._id, type: r.type, to: { uid: r.to._id, displayName: r.to.displayName, photoURL: r.to.photoURL }, createdAt: r.createdAt })),
    friends: (me.friends || []).map((f) => ({ uid: f._id, displayName: f.displayName, photoURL: f.photoURL })),
  })
}

// GET /api/friends/status/:userId — none | sent | received | friends
export const friendStatus = async (req, res) => {
  const uid = req.user._id
  const tid = req.params.userId
  const me = await User.findById(uid)
  if (me.friends.some((f) => f.toString() === tid)) return res.json({ status: 'friends' })
  const outgoing = await FriendRequest.findOne({ from: uid, to: tid, status: 'pending' })
  if (outgoing) return res.json({ status: 'sent', requestId: outgoing._id })
  const incoming = await FriendRequest.findOne({ from: tid, to: uid, status: 'pending' })
  if (incoming) return res.json({ status: 'received', requestId: incoming._id })
  res.json({ status: 'none' })
}

// POST /api/friends/request/:userId
export const sendRequest = async (req, res) => {
  const to = req.params.userId
  if (to === req.user._id.toString()) return res.status(400).json({ message: 'Cannot friend yourself' })
  const existing = await FriendRequest.findOne({
    $or: [{ from: req.user._id, to }, { from: to, to: req.user._id }],
    status: 'pending',
  })
  if (existing) return res.status(409).json({ message: 'Request already pending' })

  const request = await FriendRequest.create({ from: req.user._id, to })
  await Notification.create({
    recipient: to, sender: req.user._id,
    senderName: req.user.displayName, senderPhoto: req.user.photoURL,
    type: 'friend_request',
  }).then((n) => emitToUser(to, 'notification:new', n))
  res.status(201).json({ requestId: request._id })
}

// DELETE /api/friends/request/:requestId — cancel (sender) or decline (receiver)
export const cancelRequest = async (req, res) => {
  const request = await FriendRequest.findById(req.params.requestId)
  if (!request) return res.status(404).json({ message: 'Not found' })
  const uid = req.user._id.toString()
  if (request.from.toString() !== uid && request.to.toString() !== uid) {
    return res.status(403).json({ message: 'Not your request' })
  }
  await request.deleteOne()
  res.json({ deleted: true })
}

// POST /api/friends/accept/:requestId — friend OR follow request
export const acceptRequest = async (req, res) => {
  const request = await FriendRequest.findById(req.params.requestId)
  if (!request) return res.status(404).json({ message: 'Not found' })
  if (request.to.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the recipient can accept' })
  }

  await Promise.all([
    User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } }),
    User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } }),
    FriendRequest.findByIdAndDelete(request._id),
    Notification.create({
      recipient: request.from, sender: req.user._id,
      senderName: req.user.displayName, senderPhoto: req.user.photoURL,
      type: 'friend_accept',
    }).then((n) => emitToUser(request.from.toString(), 'notification:new', n)),
  ])
  // Tell BOTH sides' clients to refresh — sender learns they're now friends,
  // accepter's other tabs/devices sync too
  const friendPair = { a: request.from.toString(), b: request.to.toString() }
  emitToUser(friendPair.a, 'friend:accepted', { by: friendPair.b })
  emitToUser(friendPair.b, 'friend:accepted', { by: friendPair.a })
  res.json({ friendId: request.from })
}

// DELETE /api/friends/:userId — unfriend (removes both sides)
export const unfriend = async (req, res) => {
  const uid = req.user._id
  const tid = req.params.userId
  await Promise.all([
    User.findByIdAndUpdate(uid, { $pull: { friends: tid } }),
    User.findByIdAndUpdate(tid, { $pull: { friends: uid } }),
  ])
  res.json({ removed: true })
}
