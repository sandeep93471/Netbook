import { io } from 'socket.io-client'

// Singleton socket — connects lazily, authenticated by the httpOnly cookie.
let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || '/', {
      withCredentials: true,
      autoConnect: true,
    })
  }
  return socket
}

export const closeSocket = () => {
  socket?.disconnect()
  socket = null
}
