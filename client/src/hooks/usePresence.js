import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { setupPresence, subscribeToStatus, setUserOffline } from '../api/presence'

export const usePresence = () => {
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!user?.uid) return

    // Set status to online
    setupPresence(user.uid)

    // Set offline when the tab closes. pagehide is more reliable than
    // beforeunload on mobile; listen to both. Note: async writes during
    // unload are best-effort — the browser may cancel them.
    const goOffline = () => {
      setUserOffline(user.uid)
    }
    window.addEventListener('pagehide', goOffline)
    window.addEventListener('beforeunload', goOffline)

    return () => {
      setUserOffline(user.uid)
      window.removeEventListener('pagehide', goOffline)
      window.removeEventListener('beforeunload', goOffline)
    }
  }, [user?.uid])
}

// Hook to get a specific user's online status
export const useUserStatus = (userId) => {
  const [status, setStatus] = useState({ status: 'offline', lastSeen: null })

  useEffect(() => {
    if (!userId) return
    const unsub = subscribeToStatus(userId, (data) => {
      setStatus(data)
    })
    return unsub
  }, [userId])

  return status
}
