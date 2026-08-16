import mongoose from 'mongoose'

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  displayName: String,
  photoURL: String,
  imageURL: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
  // Stories stay in the DB past expiry — Highlights reference them as memories.
  // Active-story queries filter on this field instead of TTL auto-delete.
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  // Who viewed — owner-only list, like Instagram's swipe-up viewers
  viewedBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Number, default: Date.now } }],
  closeFriendsOnly: { type: Boolean, default: false }, // IG Close Friends story audience
})

export default mongoose.model('Story', storySchema)
