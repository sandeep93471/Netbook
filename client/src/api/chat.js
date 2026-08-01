import api from './client'
import { getSocket } from './socket'

// Mirrors the old api/chat.js signatures so components swap import path only.

export const getOrCreateConversation = async (_uid1, uid2) => {
  const { data } = await api.post('/chat/conversations', { otherUserId: uid2 })
  return data.conversationId
}

export const sendMessage = async (conversationId, _senderId, text) => {
  const { data } = await api.post(`/chat/conversations/${conversationId}/messages`, { text })
  getSocket().emit('message:send', { conversationId, message: data.message })
  return data.message
}

export const createGroupConversation = async (name, _creatorId, memberIds) => {
  const { data } = await api.post('/chat/groups', { name, memberIds })
  return data.conversation.id
}

export const updateConversation = (conversationId, updates) =>
  api.patch(`/chat/conversations/${conversationId}`, updates)

export const addGroupMember = (conversationId, uid) =>
  api.put(`/chat/conversations/${conversationId}/members/${uid}`)

export const removeGroupMember = (conversationId, uid) =>
  api.delete(`/chat/conversations/${conversationId}/members/${uid}`)

export const addGroupAdmin = (conversationId, uid) =>
  api.put(`/chat/conversations/${conversationId}/admins/${uid}`)

export const removeGroupAdmin = (conversationId, uid) =>
  api.delete(`/chat/conversations/${conversationId}/admins/${uid}`)

export const markConversationRead = (conversationId) =>
  api.post(`/chat/conversations/${conversationId}/read`).catch(() => {})

export const unsendMessage = (messageId) =>
  api.delete(`/chat/messages/${messageId}`)

export const reactToMessage = (messageId, emoji) =>
  api.put(`/chat/messages/${messageId}/react`, { emoji })

// REST fetch + socket updates — same subscribe/unsubscribe contract as before
export const subscribeToMessages = (conversationId, callback) => {
  const load = () =>
    api.get(`/chat/conversations/${conversationId}/messages`)
      .then((r) => callback(r.data.messages))
      .catch(() => {})
  load()
  const s = getSocket()
  s.emit('conversation:join', conversationId)
  const handler = (msg) => {
    if (msg.conversation?.toString() === conversationId || msg.id) load()
  }
  const updateHandler = () => load()
  const seenHandler = ({ conversationId: cid }) => {
    if (cid === conversationId) load()
  }
  s.on('message:new', handler)
  s.on('message:seen', seenHandler)
  s.on('message:updated', updateHandler)
  s.on('message:deleted', updateHandler)
  s.on('conversation:updated', updateHandler)
  return () => {
    s.off('message:new', handler)
    s.off('message:seen', seenHandler)
    s.off('message:updated', updateHandler)
    s.off('message:deleted', updateHandler)
    s.off('conversation:updated', updateHandler)
  }
}

export const subscribeToConversations = (_userId, callback) => {
  const load = () =>
    api.get('/chat/conversations')
      .then((r) => callback(r.data.conversations))
      .catch(() => {})
  load()
  const s = getSocket()
  const handler = () => load()
  s.on('conversation:activity', handler)
  s.on('message:new', handler)
  s.on('conversation:updated', handler)
  return () => {
    s.off('conversation:activity', handler)
    s.off('message:new', handler)
    s.off('conversation:updated', handler)
  }
}
