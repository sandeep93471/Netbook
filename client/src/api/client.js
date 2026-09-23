import axios from 'axios'

// Same-origin /api by default (Vite proxy in dev, same host in prod);
// set VITE_API_URL to point at a remote server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // sends httpOnly cookies
  timeout: 60_000, // never spin forever — Render cold starts can take ~40s
})

// Silent refresh: on 401 → POST /auth/refresh → retry the original request once.
// Concurrent 401s share a single refresh promise so we don't stampede the endpoint.
let refreshing = null
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const isRefreshCall = original?.url?.includes('/auth/')
    if (err.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true
      try {
        refreshing = refreshing || api.post('/auth/refresh').finally(() => { refreshing = null })
        await refreshing
        return api(original)
      } catch {
        return Promise.reject(err)
      }
    }
    return Promise.reject(err)
  }
)

export const apiError = (err) =>
  err.response?.data?.message || err.message || 'Something went wrong'

export default api
