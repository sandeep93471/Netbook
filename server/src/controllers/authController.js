import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import { setAuthCookies, clearAuthCookies, signRefresh, verifyRefresh } from '../utils/jwt.js'
import { sendCodeEmail } from '../utils/mailer.js'

const sixDigit = () => crypto.randomInt(100000, 999999).toString()

const publicUser = (u) => ({
  uid: u._id,
  email: u.email,
  displayName: u.displayName,
  photoURL: u.photoURL,
  coverURL: u.coverURL,
  bio: u.bio,
  verified: u.verified,
  friends: u.friends,
  followers: u.followers,
  following: u.following,
  savedPosts: u.savedPosts,
  searchHistory: u.searchHistory,
  photoHistory: u.photoHistory,
  createdAt: u.createdAt,
})

// POST /api/auth/register
export const register = async (req, res) => {
  const { displayName, email, password, dob, gender } = req.body
  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ message: 'Email already registered' })

  const code = sixDigit()
  const user = await User.create({
    displayName,
    searchName: displayName.toLowerCase(),
    email,
    passwordHash: await bcrypt.hash(password, 10),
    dob: dob ? new Date(dob) : undefined,
    gender: gender || '',
    verifyCode: await bcrypt.hash(code, 8),
    verifyExpires: Date.now() + 10 * 60 * 1000,
  })
  setAuthCookies(res, user._id)
  // Send the code in the background — SMTP on cloud hosts can be slow, so the
  // user gets to the verify page immediately instead of a frozen button.
  sendCodeEmail(email, code, 'verify')
    .then((sent) => { if (!sent) console.warn(`[mailer] verify email not sent to ${email}`) })
    .catch((err) => console.error('[mailer] verify email failed:', err.message))
  // Dev convenience: no SMTP configured → return the code so the flow is testable
  const devCode = process.env.EMAIL_USER || process.env.NODE_ENV === 'production' ? undefined : code
  res.status(201).json({ user: publicUser(user), emailSent: true, devCode })
}

// POST /api/auth/login
export const login = async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password' })
  }
  setAuthCookies(res, user._id)
  res.json({ user: publicUser(user) })
}

// POST /api/auth/logout
export const logout = (req, res) => {
  clearAuthCookies(res)
  res.json({ message: 'Logged out' })
}

// POST /api/auth/google { credential } — Google ID token from @react-oauth/google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
export const googleAuth = async (req, res) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const { email, name, picture, email_verified } = ticket.getPayload()

    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        displayName: name || email.split('@')[0],
        searchName: (name || email.split('@')[0]).toLowerCase(),
        email,
        passwordHash: crypto.randomBytes(32).toString('hex'), // no local password
        photoURL: picture || '',
        verified: !!email_verified,
      })
    }

    setAuthCookies(res, user._id)
    res.json({ user: publicUser(user) })
  } catch (err) {
    res.status(401).json({ message: 'Google sign-in failed', detail: err.message })
  }
}

// GET /api/auth/me — session restore on app load
export const me = (req, res) => res.json({ user: publicUser(req.user) })

// POST /api/auth/refresh — silent token rotation (refresh cookie only sent here)
export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refresh_token
    if (!token) return res.status(401).json({ message: 'No refresh token' })
    const { id } = verifyRefresh(token)
    const user = await User.findById(id)
    if (!user) return res.status(401).json({ message: 'User not found' })
    setAuthCookies(res, user._id)
    res.json({ ok: true })
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' })
  }
}

// POST /api/auth/send-verify-code
export const sendVerifyCode = async (req, res) => {
  const user = req.user
  if (user.verified) return res.json({ message: 'Already verified' })
  const code = sixDigit()
  user.verifyCode = await bcrypt.hash(code, 8)
  user.verifyExpires = Date.now() + 10 * 60 * 1000
  await user.save()
  const sent = await sendCodeEmail(user.email, code, 'verify')
  const devCode = !sent && process.env.NODE_ENV !== 'production' ? code : undefined
  res.json({ sent, devCode, message: sent ? 'Code sent' : 'Email not configured' })
}

// POST /api/auth/verify-email { code }
export const verifyEmail = async (req, res) => {
  const { code } = req.body
  const user = req.user
  if (!user.verifyCode || Date.now() > user.verifyExpires) {
    return res.status(400).json({ message: 'Code expired — request a new one' })
  }
  if (!(await bcrypt.compare(code, user.verifyCode))) {
    return res.status(400).json({ message: 'Wrong code' })
  }
  user.verified = true
  user.verifyCode = undefined
  user.verifyExpires = undefined
  await user.save()
  res.json({ verified: true })
}

// POST /api/auth/forgot { email } — send reset code
export const forgotPassword = async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.json({ sent: true }) // don't leak whether email exists
  const code = sixDigit()
  user.resetCode = await bcrypt.hash(code, 8)
  user.resetExpires = Date.now() + 10 * 60 * 1000
  await user.save()
  const sent = await sendCodeEmail(email, code, 'reset')
  // Dev convenience — SMTP off in development → return the code for testing
  const devCode = !sent && process.env.NODE_ENV !== 'production' ? code : undefined
  res.json({ sent: true, devCode })
}

// POST /api/auth/reset { email, code, password }
export const resetPassword = async (req, res) => {
  const { email, code, password } = req.body
  const user = await User.findOne({ email })
  if (!user?.resetCode || Date.now() > user.resetExpires) {
    return res.status(400).json({ message: 'Code expired — request a new one' })
  }
  if (!(await bcrypt.compare(code, user.resetCode))) {
    return res.status(400).json({ message: 'Wrong code' })
  }
  user.passwordHash = await bcrypt.hash(password, 10)
  user.resetCode = undefined
  user.resetExpires = undefined
  await user.save()
  res.json({ message: 'Password updated' })
}
