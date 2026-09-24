import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: String,
  senderPhoto: String,
  type: {
    type: String,
    enum: ['like', 'comment', 'reply', 'follow', 'friend_request', 'friend_accept', 'share', 'mention'],
    required: true,
  },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  postText: String,
  read: { type: Boolean, default: false },
}, { timestamps: true })

// Notification bell: unread count + newest-first list per user
notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, read: 1 })

export default mongoose.model('Notification', notificationSchema)
