import api from './client'
import { getSocket } from './socket'

export const subscribeToNotifications = (_userId, callback) => {
  const load = () =>
    api.get('/notifications')
      .then((r) => callback(r.data.notifications))
      .catch(() => {})
  load()
  const s = getSocket()
  s.on('notification:new', load)
  return () => s.off('notification:new', load)
}

export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.put('/notifications/read-all')
