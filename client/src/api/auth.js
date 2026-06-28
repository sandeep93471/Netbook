import api from './client'

export const registerWithEmail = async (email, password, displayName, dob, gender) => {
  const { data } = await api.post('/auth/register', { email, password, displayName, dob, gender })
  return data.user
}

export const loginWithEmail = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password })
  return { user: data.user }
}

// Google sign-in — send the Google ID token, server verifies + sets cookies
export const loginWithGoogle = async (credential) => {
  const { data } = await api.post('/auth/google', { credential })
  return data.user
}

export const logout = () => api.post('/auth/logout')

export const fetchMe = async () => {
  const { data } = await api.get('/auth/me')
  return data.user
}

// One-shot auth check on app load — replaces Firebase's onAuthStateChanged
export const subscribeToAuth = (callback) => {
  fetchMe()
    .then((user) => callback(user))
    .catch(() => callback(null))
  return () => {} // no live auth subscription needed; refresh is per-request
}

export const resetPassword = (email) =>
  api.post('/auth/forgot', { email })

export const confirmReset = (email, code, password) =>
  api.post('/auth/reset', { email, code, password })

export const sendVerifyCode = () => api.post('/auth/send-verify-code')
export const verifyEmail = (code) => api.post('/auth/verify-email', { code })

// Kept for AppLayout compatibility — MERN uses a 6-digit code, not a link
export const resendVerificationEmail = () => api.post('/auth/send-verify-code')
