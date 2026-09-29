import axios from 'axios'

// Always same-origin /api — Vite proxies it in dev, Vercel rewrites it to
// Render in prod (client/vercel.json). First-party cookies: browsers never
// drop them, so sessions survive — third-party cookies get blocked and the
// session died after a few hours. VITE_API_URL is still used by socket.js
// (WebSockets can't ride the HTTP rewrite).
const api = axios.create({
  baseURL: '/api',
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
