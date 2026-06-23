import { verifyAccess } from '../utils/jwt.js'
import User from '../models/User.js'

// Protects routes — reads the httpOnly access_token cookie
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.access_token
    if (!token) return res.status(401).json({ message: 'Not authenticated' })
    const { id } = verifyAccess(token)
    const user = await User.findById(id).select('-passwordHash -refreshTokenHash')
    if (!user) return res.status(401).json({ message: 'User not found' })
    req.user = user
    next()
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' })
  }
}
