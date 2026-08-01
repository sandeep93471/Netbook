import api from './client'
import { getSocket } from './socket'

// Presence is automatic — the socket connection marks us online server-side
export const setupPresence = async () => { getSocket() }
export const setUserOffline = async () => {}

// REST snapshot + live presence events
export const subscribeToStatus = (userId, callback) => {
  api.get(`/users/status/${userId}`)
    .then((r) => callback(r.data))
    .catch(() => callback({ status: 'offline' }))

  const s = getSocket()
  const onOnline = ({ userId: id }) => {
    if (id === userId) callback({ status: 'online' })
  }
  const onOffline = ({ userId: id, lastSeen }) => {
    if (id === userId) callback({ status: 'offline', lastSeen })
  }
  s.on('presence:online', onOnline)
  s.on('presence:offline', onOffline)
  return () => {
    s.off('presence:online', onOnline)
    s.off('presence:offline', onOffline)
  }
}
