import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchMe } from '../api/auth'
import { setUser } from '../redux/slices/authSlice'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const toUser = (user) => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
  emailVerified: user.verified,
})

// Session restore on app load — GET /me; the axios interceptor silently
// refreshes the access token first if it's expired.
export const useAuthListener = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    const restore = async () => {
      try {
        dispatch(setUser(toUser(await fetchMe())))
      } catch (err) {
        const status = err?.response?.status
        // 401/403 = genuinely logged out. Anything else (network error, timeout,
        // 5xx during a deploy/cold start) deserves one retry before giving up.
        if (status === 401 || status === 403 || !(await tryAgain())) {
          dispatch(setUser(null))
        }
      }
    }

    const tryAgain = async () => {
      await sleep(3000)
      try {
        dispatch(setUser(toUser(await fetchMe())))
        return true
      } catch {
        return false
      }
    }

    restore()
  }, [dispatch])
}
