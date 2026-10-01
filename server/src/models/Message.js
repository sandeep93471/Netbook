import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', maxlength: 500 },
  // E2EE ciphertext — { v: 1, iv, ct } (base64 AES-256-GCM). When set, the
  // server never sees plaintext; text stays empty.
  enc: { type: Object, default: null },
  read: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: { type: Map, of: String, default: {} }, // uid → emoji
}, { timestamps: true })

// Chat history pagination per conversation
messageSchema.index({ conversation: 1, createdAt: 1 })

export default mongoose.model('Message', messageSchema)
