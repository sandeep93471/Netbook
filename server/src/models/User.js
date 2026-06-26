import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true },
  searchName: { type: String, index: true }, // lowercase for prefix search
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  photoURL: { type: String, default: '' },
  coverURL: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  dob: Date,
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  isPrivate: { type: Boolean, default: false }, // private account → follow needs approval
  closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // IG Close Friends list
  fcmTokens: [{ type: String }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  photoHistory: [{ url: String, type: { type: String }, at: Number }],
  searchHistory: [{ term: String, at: Number }],
  verified: { type: Boolean, default: false },
  verifyCode: String,
  verifyExpires: Number,
  resetCode: String,
  resetExpires: Number,
  refreshTokenHash: String, // hashed refresh token — stolen cookie can't be replayed
  lastSeen: { type: Number, default: Date.now },
}, { timestamps: true })

export default mongoose.model('User', userSchema)
