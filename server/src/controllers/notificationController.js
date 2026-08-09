import Notification from '../models/Notification.js'

// GET /api/notifications — my 50 newest
export const getNotifications = async (req, res) => {
  const notifs = await Notification.find({ recipient: req.user._id })
    .sort({ createdAt: -1 }).limit(50).lean()
  res.json({
    notifications: notifs.map((n) => ({
      ...n, id: n._id, senderId: n.sender?.toString(), createdAt: new Date(n.createdAt).getTime(),
    })),
  })
}

// PUT /api/notifications/:id/read
export const markRead = async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true }
  )
  res.json({ ok: true })
}

// PUT /api/notifications/read-all
export const markAllRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true })
  res.json({ ok: true })
}
