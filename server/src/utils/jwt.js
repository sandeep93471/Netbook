import jwt from 'jsonwebtoken'

const isProd = process.env.NODE_ENV === 'production'

export const signAccess = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' })

export const signRefresh = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

export const verifyAccess = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET)

export const verifyRefresh = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET)

// Sets httpOnly cookies — JS can't read them, XSS can't steal them
export const setAuthCookies = (res, userId) => {
  res.cookie('access_token', signAccess(userId), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' needed for cross-origin (Vercel→Render)
    maxAge: 15 * 60 * 1000, // 15 min
  })
  res.cookie('refresh_token', signRefresh(userId), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth', // only sent to auth endpoints
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
}

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token')
  res.clearCookie('refresh_token', { path: '/api/auth' })
}
