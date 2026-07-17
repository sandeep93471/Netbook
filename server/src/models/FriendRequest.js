import mongoose from 'mongoose'

const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  type: { type: String, enum: ['friend', 'follow'], default: 'friend' }, // follow = private-account approval
}, { timestamps: true })

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true })

export default mongoose.model('FriendRequest', friendRequestSchema)
