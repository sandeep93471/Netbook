import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String, default: '' },
  theme: { type: String, default: '#1976d2' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Group permissions — Messenger-style controls
  settings: {
    whoCanMessage: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
    whoCanAddMembers: { type: String, enum: ['everyone', 'admins'], default: 'everyone' },
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantInfo: { type: Map, of: { displayName: String, photoURL: String }, default: {} },
  lastMessage: { type: String, default: '' },
  lastSenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessageAt: { type: Number, default: Date.now },
  unreadCounts: { type: Map, of: Number, default: {} }, // uid → count
}, { timestamps: true })

export default mongoose.model('Conversation', conversationSchema)
