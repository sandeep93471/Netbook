import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500 },
  read: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: { type: Map, of: String, default: {} }, // uid → emoji
}, { timestamps: true })

// Chat history pagination per conversation
messageSchema.index({ conversation: 1, createdAt: 1 })

export default mongoose.model('Message', messageSchema)
