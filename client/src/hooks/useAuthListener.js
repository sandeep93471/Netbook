import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchMe } from '../api/auth'
import { setUser } from '../redux/slices/authSlice'

// Session restore on app load — GET /me; the axios interceptor silently
// refreshes the access token first if it's expired.
export const useAuthListener = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    fetchMe()
      .then((user) => dispatch(setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.verified,
      })))
      .catch(() => dispatch(setUser(null)))
  }, [dispatch])
}
