import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { subscribeToNotifications } from '../api/notifications'
import { setNotifications } from '../redux/slices/notificationSlice'

export const useNotifications = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)

  useEffect(() => {
    if (!user?.uid) return

    // Initial load + real-time listener (fires immediately, then on every change)
    const unsub = subscribeToNotifications(user.uid, (notifications) => {
      dispatch(setNotifications(notifications))
    })

    return unsub // cleanup on unmount
  }, [user?.uid, dispatch])
}
