import { getSocket } from './socket'

export const setTyping = async (conversationId, _userId, isTyping) => {
  getSocket().emit('typing', { conversationId, isTyping })
}

// cb receives entries [{ id, isTyping, timestamp }] — same shape as before
export const subscribeToTyping = (conversationId, callback) => {
  const entries = new Map()
  const handler = ({ userId, conversationId: cid, isTyping, timestamp }) => {
    if (cid !== conversationId) return
    if (isTyping) entries.set(userId, { id: userId, isTyping, timestamp })
    else entries.delete(userId)
    callback([...entries.values()])
  }
  const s = getSocket()
  s.on('typing', handler)
  return () => s.off('typing', handler)
}
