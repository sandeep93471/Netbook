import { logger } from './logger.js'
import User from '../models/User.js'

// Web Push (VAPID) — free forever, no Firebase console needed. Disabled unless
// VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY are set; generate with:
//   npx web-push generate-vapid-keys
let webpush = null

const init = async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  try {
    const mod = await import('web-push')
    webpush = mod.default
    webpush.setVapidDetails(
      VAPID_SUBJECT || 'mailto:admin@netbook.local',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    )
    logger.info('web push enabled (VAPID)')
  } catch (err) {
    logger.warn({ err: err.message }, 'web-push unavailable — push disabled')
  }
}
init()

export const pushEnabled = () => !!webpush
export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null

// Send a notification to every device the user subscribed. Stale
// subscriptions (404/410 from the push service) are pruned automatically.
export const sendPushToUser = async (userId, payload) => {
  if (!webpush) return
  try {
    const user = await User.findById(userId).select('pushSubscriptions')
    if (!user?.pushSubscriptions?.length) return
    const dead = []
    await Promise.allSettled(user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
          { TTL: 3600 },
        )
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) dead.push(sub.endpoint)
        else throw err
      }
    }))
    if (dead.length) {
      await User.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: dead } } } },
      )
    }
  } catch (err) {
    logger.warn({ err: err.message, userId }, 'push send failed')
  }
}
