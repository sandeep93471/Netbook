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

export default mongoose.model('Notification', notificationSchema)
