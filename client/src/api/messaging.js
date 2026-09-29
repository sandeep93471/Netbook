// Push notifications via FCM need a server sender — can be added later
// with webpush + VAPID keys on this server (free). Stubbed for now.
// onForegroundMessage MUST resolve to an unsubscribe function — callers
// invoke it in effect cleanup; returning undefined crashes the app on logout.
export const requestNotificationPermission = async () => null
export const onForegroundMessage = async () => () => {}
