import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { requestNotificationPermission, onForegroundMessage } from '../api/messaging'

export const useFCM = () => {
  const { user } = useSelector((state) => state.auth)
  const [foregroundNotification, setForegroundNotification] = useState(null)

  useEffect(() => {
    if (!user?.uid) return

    // Request permission and get token
    requestNotificationPermission(user.uid)

    let unsub = () => {}
    let cancelled = false
    // Listen for foreground messages (app is open)
    onForegroundMessage((payload) => {
      if (cancelled) return
      const { title, body } = payload.notification || payload.data || {}
      // Show in-app toast notification
      setForegroundNotification({ title, body })

      // Auto-clear after 5 seconds
      setTimeout(() => setForegroundNotification(null), 5000)
    }).then((u) => { unsub = u })

    return () => {
      cancelled = true
      unsub()
    }
  }, [user?.uid])

  return { foregroundNotification, clearNotification: () => setForegroundNotification(null) }
}
