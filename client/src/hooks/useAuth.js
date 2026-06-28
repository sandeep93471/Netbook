import { useSelector, useDispatch } from 'react-redux'
import {
  selectUser, selectIsAuthenticated, selectAuthLoading,
  loginUser, logoutUser,
} from '../redux/slices/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)

  return {
    user,
    isAuthenticated,
    loading,
    login: (credentials) => dispatch(loginUser(credentials)),
    logout: () => dispatch(logoutUser()),
  }
}