import mongoose from 'mongoose'

// Instagram-style Highlights — named story collections that live on the profile.
// Items reference Story docs (stories no longer TTL-delete, so links persist).
const highlightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, maxlength: 30, trim: true },
  coverImage: { type: String, default: '' }, // defaults to first item's image
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
}, { timestamps: true })

export default mongoose.model('Highlight', highlightSchema)
