import { Server } from 'socket.io'
import cookie from 'cookie'
import { verifyAccess } from '../utils/jwt.js'
import User from '../models/User.js'
import { socketsConnected } from '../utils/metrics.js'

let io = null
const online = new Map() // userId → socket.id

// Push a realtime event to one user (controllers call this)
export const emitToUser = (userId, event, data) => {
  const sid = online.get(userId.toString())
  if (io && sid) io.to(sid).emit(event, data)
}

export const isOnline = (userId) => online.has(userId.toString())
export const onlineUserIds = () => [...online.keys()]

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  })

  // Authenticate sockets — handshake token first (the auth cookie lives on the
  // Vercel domain and isn't visible to a cross-origin WS connect), cookie
  // fallback keeps same-origin setups working.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || cookie.parse(socket.request.headers.cookie || '').access_token
      const { id } = verifyAccess(token)
      socket.userId = id
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    const uid = socket.userId
    online.set(uid, socket.id)
    socketsConnected.set(online.size)
    socket.join(`user:${uid}`)
    io.emit('presence:online', { userId: uid }) // broadcast to everyone

    // Conversation rooms — client emits the ids it belongs to
    socket.on('conversation:join', (convoId) => socket.join(`convo:${convoId}`))

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`convo:${conversationId}`).emit('typing', {
        userId: uid, conversationId, isTyping, timestamp: Date.now(),
      })
    })

    // New message arrives via REST POST (persisted), server relays it here too
    // so senders on other devices see it instantly.
    socket.on('message:send', ({ conversationId, message }) => {
      socket.to(`convo:${conversationId}`).emit('message:new', message)
    })

    socket.on('disconnect', async () => {
      online.delete(uid)
      socketsConnected.set(online.size)
      const lastSeen = Date.now()
      io.emit('presence:offline', { userId: uid, lastSeen })
      User.findByIdAndUpdate(uid, { lastSeen }).catch(() => {})
    })
  })

  return io
}

// Emit a new message to a whole conversation room (called by message controller)
export const emitToConversation = (convoId, event, data) => {
  if (io) io.to(`convo:${convoId}`).emit(event, data)
}
