import { io } from 'socket.io-client'

// Singleton socket — connects lazily, authenticated by a short-lived token
// fetched via /api (first-party). Sockets go straight to Render — Vercel
// can't proxy WebSockets — so the httpOnly cookie isn't visible there.
// Emits made before connect() are buffered by socket.io, so callers stay sync.
let socket = null

const fetchToken = () =>
  fetch('/api/auth/socket-token', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then(({ token }) => token)

export const getSocket = () => {
  if (!socket) {
    const origin = import.meta.env.VITE_API_URL?.replace('/api', '') || '/'
    socket = io(origin, { autoConnect: false, withCredentials: true })
    fetchToken()
      .then((token) => { socket.auth = { token } })
      .catch(() => {}) // same-origin cookie fallback still applies
      .finally(() => socket.connect())
    // Access tokens expire — refresh the handshake token between retries
    socket.on('connect_error', () => {
      fetchToken().then((token) => { socket.auth = { token } }).catch(() => {})
    })
  }
  return socket
}

export const closeSocket = () => {
  socket?.disconnect()
  socket = null
}
