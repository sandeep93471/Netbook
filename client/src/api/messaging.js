import api from './client'

// Web Push (VAPID) — the server sends notifications to offline users via
// /sw.js. Everything here degrades silently: no service worker, no PushManager,
// push disabled server-side, or permission denied → we just skip.

const urlB64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const requestNotificationPermission = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
    const { data } = await api.get('/notifications/push-key')
    if (!data.enabled || !data.publicKey) return null

    const reg = await navigator.serviceWorker.register('/sw.js')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(data.publicKey),
    })
    await api.post('/users/me/push-subscription', { subscription: sub.toJSON() })
    return sub
  } catch {
    return null // denied/unsupported — never break the app over push
  }
}

// Called on logout — stop this device receiving pushes for the account
export const removePushSubscription = async () => {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await api.delete('/users/me/push-subscription', { data: { endpoint: sub.endpoint } })
      await sub.unsubscribe()
    }
  } catch { /* best effort */ }
}

// In-app notifications already arrive over socket.io ('notification:new') —
// this stays a no-op unsubscribe so callers' cleanup never crashes.
export const onForegroundMessage = async () => () => {}
