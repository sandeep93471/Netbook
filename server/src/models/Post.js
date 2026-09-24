import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  text: { type: String, default: '' }, // may be empty for video-only reels
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  displayName: String, // denormalized for feed speed
  photoURL: String,
  imageURL: { type: String, default: '' },
  background: { type: String, default: null },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: { type: Map, of: String, default: {} }, // uid → 'like'|'love'|'haha'|'wow'|'sad'|'angry'
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  hidden: { type: Boolean, default: false },
  sharedFrom: { type: Object, default: null }, // { id, displayName, photoURL, text, imageURL, createdAt }
  hashtags: [{ type: String, index: true }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mentionMap: { type: Map, of: String, default: {} }, // name → uid for render links
  searchTerms: [{ type: String, index: true }],
  // Audience selector — like FB's Public / Friends / Only me
  visibility: { type: String, enum: ['public', 'followers', 'closefriends', 'onlyme'], default: 'public' },
  videoURL: { type: String, default: '' }, // reels — max 5 min enforced client-side + upload preset
}, { timestamps: true })

// Feed sort + per-profile post lists hit these constantly
postSchema.index({ createdAt: -1 })
postSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)
