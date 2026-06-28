import { showError, showSuccess } from '../../utils/errorHandler'

// Automatically toast rejected thunk errors and key success events,
// so no failure is ever silent
export const toastMiddleware = () => (next) => (action) => {
  // Show error toasts for rejected thunks
  if (action.type.endsWith('/rejected')) {
    showError(action.payload || action.error)
  }

  // Success toasts for key actions
  if (action.type === 'posts/create/fulfilled') {
    showSuccess('Post created!')
  }
  if (action.type === 'auth/register/fulfilled') {
    showSuccess('Account created! Welcome to Netbook!')
  }
  if (action.type === 'follow/follow/fulfilled') {
    showSuccess('Followed successfully!')
  }
  if (action.type === 'follow/unfollow/fulfilled') {
    showSuccess('Unfollowed')
  }

  return next(action)
}
