import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import { emitToConversation, emitToUser } from '../socket/index.js'

const shapeConvo = (c) => ({ ...c.toObject({ flattenMaps: true }), id: c._id })
const shapeMsg = (m) => ({ ...m.toObject({ flattenMaps: true }), id: m._id, senderId: m.sender?.toString() })

// GET /api/chat/conversations — mine, newest activity first
export const getConversations = async (req, res) => {
  const convos = await Conversation.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 }).lean()
  res.json({ conversations: convos.map((c) => ({ ...c, id: c._id })) })
}

// POST /api/chat/conversations { otherUserId } — get-or-create DM
export const getOrCreateDM = async (req, res) => {
  const otherId = req.body.otherUserId
  const uid = req.user._id
  const existing = await Conversation.findOne({
    isGroup: { $ne: true },
    participants: { $all: [uid, otherId], $size: 2 },
  })
  if (existing) return res.json({ conversationId: existing._id })

  const other = await User.findById(otherId)
  if (!other) return res.status(404).json({ message: 'User not found' })
  const convo = await Conversation.create({
    participants: [uid, otherId],
    participantInfo: {
      [uid]: { displayName: req.user.displayName, photoURL: req.user.photoURL },
      [otherId]: { displayName: other.displayName, photoURL: other.photoURL },
    },
    unreadCounts: { [uid]: 0, [otherId]: 0 },
  })
  res.status(201).json({ conversationId: convo._id })
}

// POST /api/chat/groups { name, memberIds }
export const createGroup = async (req, res) => {
  const { name, memberIds = [] } = req.body
  const allIds = [...new Set([req.user._id.toString(), ...memberIds])]
  const members = await User.find({ _id: { $in: allIds } }).select('displayName photoURL')
  const participantInfo = {}
  members.forEach((m) => {
    participantInfo[m._id] = { displayName: m.displayName, photoURL: m.photoURL }
  })
  const convo = await Conversation.create({
    isGroup: true, name,
    admins: [req.user._id],
    participants: allIds,
    participantInfo,
    unreadCounts: Object.fromEntries(allIds.map((id) => [id, 0])),
  })
  res.status(201).json({ conversation: shapeConvo(convo) })
}

// PATCH /api/chat/conversations/:id — theme (anyone), name (admin only for groups)
export const updateConversation = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo) return res.status(404).json({ message: 'Not found' })
  const uid = req.user._id.toString()
  if (!convo.participants.some((p) => p.toString() === uid)) {
    return res.status(403).json({ message: 'Not a participant' })
  }
  if (req.body.name !== undefined) {
    if (!convo.isGroup) return res.status(400).json({ message: 'Cannot rename a DM' })
    if (!convo.admins.some((a) => a.toString() === uid)) {
      return res.status(403).json({ message: 'Admins only' })
    }
    convo.name = req.body.name
  }
  if (req.body.theme) convo.theme = req.body.theme
  // Group permission settings — admin only
  if (req.body.settings) {
    if (!convo.isGroup) return res.status(400).json({ message: 'Not a group' })
    if (!convo.admins.some((a) => a.toString() === uid)) {
      return res.status(403).json({ message: 'Admins only' })
    }
    const { whoCanMessage, whoCanAddMembers } = req.body.settings
    if (['everyone', 'admins'].includes(whoCanMessage)) convo.settings.whoCanMessage = whoCanMessage
    if (['everyone', 'admins'].includes(whoCanAddMembers)) convo.settings.whoCanAddMembers = whoCanAddMembers
  }
  await convo.save()
  emitToConversation(convo._id, 'conversation:updated', shapeConvo(convo))
  res.json({ conversation: shapeConvo(convo) })
}

// PUT /api/chat/conversations/:id/admins/:uid — promote member to admin (admin only)
export const addAdmin = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' })
  const uid = req.user._id.toString()
  if (!convo.admins.some((a) => a.toString() === uid)) {
    return res.status(403).json({ message: 'Admins only' })
  }
  const target = req.params.uid
  if (!convo.participants.some((p) => p.toString() === target)) {
    return res.status(400).json({ message: 'Not a member' })
  }
  convo.admins.addToSet(target)
  await convo.save()
  emitToConversation(convo._id, 'conversation:updated', shapeConvo(convo))
  res.json({ conversation: shapeConvo(convo) })
}

// DELETE /api/chat/conversations/:id/admins/:uid — demote admin (admin only,
// can't remove the last admin)
export const removeAdmin = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' })
  const uid = req.user._id.toString()
  if (!convo.admins.some((a) => a.toString() === uid)) {
    return res.status(403).json({ message: 'Admins only' })
  }
  if (convo.admins.length <= 1) {
    return res.status(400).json({ message: 'A group needs at least one admin' })
  }
  convo.admins = convo.admins.filter((a) => a.toString() !== req.params.uid)
  await convo.save()
  emitToConversation(convo._id, 'conversation:updated', shapeConvo(convo))
  res.json({ conversation: shapeConvo(convo) })
}

// PUT /api/chat/conversations/:id/members/:uid — respects whoCanAddMembers
export const addMember = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' })
  const uid = req.user._id.toString()
  if (!convo.participants.some((p) => p.toString() === uid)) {
    return res.status(403).json({ message: 'Not a participant' })
  }
  const isAdmin = convo.admins.some((a) => a.toString() === uid)
  if (convo.settings?.whoCanAddMembers === 'admins' && !isAdmin) {
    return res.status(403).json({ message: 'Only admins can add members' })
  }
  const member = await User.findById(req.params.uid).select('displayName photoURL')
  if (!member) return res.status(404).json({ message: 'User not found' })
  convo.participants.addToSet(member._id)
  convo.participantInfo.set(member._id.toString(), { displayName: member.displayName, photoURL: member.photoURL })
  convo.unreadCounts.set(member._id.toString(), 0)
  await convo.save()
  emitToConversation(convo._id, 'conversation:updated', shapeConvo(convo))
  res.json({ conversation: shapeConvo(convo) })
}

// DELETE /api/chat/conversations/:id/members/:uid — admin removes anyone, member leaves self
export const removeMember = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' })
  const uid = req.user._id.toString()
  const target = req.params.uid
  const isAdmin = convo.admins.some((a) => a.toString() === uid)
  if (!isAdmin && target !== uid) return res.status(403).json({ message: 'Admins only' })
  convo.participants = convo.participants.filter((p) => p.toString() !== target)
  convo.participantInfo.delete(target)
  convo.admins = convo.admins.filter((a) => a.toString() !== target)
  await convo.save()
  emitToConversation(convo._id, 'conversation:updated', shapeConvo(convo))
  res.json({ conversation: shapeConvo(convo) })
}

// GET /api/chat/conversations/:id/messages
export const getMessages = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: 'Not a participant' })
  }
  const messages = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 }).limit(200).lean()
  res.json({ messages: messages.map((m) => ({ ...m, id: m._id, senderId: m.sender?.toString(), createdAt: new Date(m.createdAt).getTime() })) })
}

// POST /api/chat/conversations/:id/messages — persist + emit to room
export const sendMessage = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (!convo?.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ message: 'Not a participant' })
  }
  const uid = req.user._id.toString()
  // Group permission — "admins only" messaging
  if (convo.isGroup && convo.settings?.whoCanMessage === 'admins'
      && !convo.admins.some((a) => a.toString() === uid)) {
    return res.status(403).json({ message: 'Only admins can send messages in this group' })
  }
  const message = await Message.create({
    conversation: convo._id, sender: req.user._id, text: req.body.text,
  })
  convo.lastMessage = req.body.text
  convo.lastSenderId = req.user._id
  convo.lastMessageAt = Date.now()
  convo.participants.forEach((p) => {
    const pid = p.toString()
    if (pid !== uid) convo.unreadCounts.set(pid, (convo.unreadCounts.get(pid) || 0) + 1)
  })
  await convo.save()

  const shaped = { ...message.toObject({ flattenMaps: true }), id: message._id, senderId: uid, createdAt: message.createdAt.getTime() }
  emitToConversation(convo._id, 'message:new', shaped)
  // Sidebar refresh for members not in the room
  convo.participants.forEach((p) => emitToUser(p.toString(), 'conversation:activity', { id: convo._id }))
  res.status(201).json({ message: shaped })
}

// POST /api/chat/conversations/:id/read — clear unread + mark messages seen
export const markRead = async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
  if (convo) {
    const uid = req.user._id
    convo.unreadCounts.set(uid.toString(), 0)
    await Promise.all([
      convo.save(),
      Message.updateMany(
        { conversation: convo._id, read: { $ne: uid } },
        { $addToSet: { read: uid } }
      ),
    ])
    // Tell the room I saw everything — senders update their ✓✓ ticks
    emitToConversation(convo._id, 'message:seen', {
      conversationId: convo._id, userId: uid.toString(),
    })
  }
  res.json({ ok: true })
}

// DELETE /api/chat/messages/:id — unsend (sender only, removes for everyone)
export const unsendMessage = async (req, res) => {
  const msg = await Message.findById(req.params.id)
  if (!msg) return res.status(404).json({ message: 'Not found' })
  if (msg.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the sender can unsend' })
  }
  await msg.deleteOne()
  emitToConversation(msg.conversation, 'message:deleted', { id: msg._id, conversationId: msg.conversation })
  res.json({ deleted: true })
}

// PUT /api/chat/messages/:id/react { emoji } — toggle my reaction on a message
export const reactMessage = async (req, res) => {
  const msg = await Message.findById(req.params.id)
  if (!msg) return res.status(404).json({ message: 'Not found' })
  const uid = req.user._id.toString()
  const emoji = req.body.emoji
  if (emoji && msg.reactions.get(uid) !== emoji) msg.reactions.set(uid, emoji)
  else msg.reactions.delete(uid)
  await msg.save()
  const shaped = { ...msg.toObject({ flattenMaps: true }), id: msg._id, senderId: msg.sender.toString(), createdAt: msg.createdAt.getTime() }
  emitToConversation(msg.conversation, 'message:updated', shaped)
  res.json({ message: shaped })
}
