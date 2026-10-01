import Notification from '../models/Notification.js'
import { emitToUser } from '../socket/index.js'
import { sendPushToUser } from './push.js'

// Central notification pipeline — every "X did Y on your Z" goes through here:
// 1. persist a Notification doc (history + unread badge)
// 2. emit over socket if the user is online (live badge bump)
// 3. web-push to their devices if they're offline
const PUSH_COPY = {
  like: (s) => `${s} reacted to your post`,
  comment: (s) => `${s} commented on your post`,
  reply: (s) => `${s} replied to your comment`,
  share: (s) => `${s} shared your post`,
  mention: (s) => `${s} mentioned you`,
  follow: (s) => `${s} started following you`,
  friend_request: (s) => `${s} sent you a friend request`,
  friend_accept: (s) => `${s} accepted your friend request`,
  message: (s) => `${s} sent you a message`,
}

export const notify = async ({ recipientId, sender, type, postId, postText }) => {
  if (recipientId.toString() === sender._id.toString()) return null
  const n = await Notification.create({
    recipient: recipientId, sender: sender._id,
    senderName: sender.displayName, senderPhoto: sender.photoURL,
    type, postId, postText: postText?.slice(0, 80),
  })
  emitToUser(recipientId, 'notification:new', n)
  // Fire-and-forget — a slow push service must not hold up the API response
  sendPushToUser(recipientId, {
    title: 'Netbook',
    body: PUSH_COPY[type]?.(sender.displayName) || 'New notification',
    url: type === 'message' ? '/chat' : postId ? `/post/${postId}` : '/notifications',
    tag: `netbook-${type}`,
  }).catch(() => {})
  return n
}
