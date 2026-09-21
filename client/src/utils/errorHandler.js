import toast from 'react-hot-toast'
import { apiError } from '../api/client'

// Axios errors carry the server's message in response.data — surface that.
export const getErrorMessage = (error) => apiError(error)

// Show error toast
export const showError = (error) => {
  const message = getErrorMessage(error)
  toast.error(message, { duration: 4000 })
}

// Show success toast
export const showSuccess = (message) => {
  toast.success(message, { duration: 3000 })
}

// Retry wrapper for async operations (linear backoff: 1s, 2s, 3s)
export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      console.log(`Retry ${attempt}/${maxRetries} failed, retrying...`)
      await new Promise((r) => setTimeout(r, delay * attempt))
    }
  }
}
