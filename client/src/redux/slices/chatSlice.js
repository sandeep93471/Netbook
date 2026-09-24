import { createSlice } from '@reduxjs/toolkit'

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    conversationsLoaded: false,
    activeConversation: null,
    messages: [],
    loading: false,
    error: null,
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload
      state.conversationsLoaded = true
    },
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload
    },
    setMessages: (state, action) => {
      state.messages = action.payload
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },
    // Insert or update by id — also absorbs a matching optimistic temp message
    // (same sender + same text) so socket echoes never duplicate it.
    upsertMessage: (state, action) => {
      const msg = action.payload
      const idx = state.messages.findIndex((m) => m.id === msg.id)
      if (idx >= 0) {
        state.messages[idx] = { ...state.messages[idx], ...msg, pending: false }
        return
      }
      const tempIdx = state.messages.findIndex(
        (m) => m.pending && m.senderId === msg.senderId && m.text === msg.text
      )
      if (tempIdx >= 0) {
        state.messages[tempIdx] = msg
        return
      }
      state.messages.push(msg)
    },
    replaceTempMessage: (state, action) => {
      const { tempId, message } = action.payload
      const idx = state.messages.findIndex((m) => m.id === tempId)
      if (idx >= 0) state.messages[idx] = message
    },
    removeMessage: (state, action) => {
      state.messages = state.messages.filter((m) => m.id !== action.payload)
    },
    updateLastMessage: (state, action) => {
      const { conversationId, message, senderId } = action.payload
      const convo = state.conversations.find((c) => c.id === conversationId)
      if (convo) {
        convo.lastMessage = message
        convo.lastSenderId = senderId
        convo.lastMessageAt = Date.now()
      }
    },
  },
})

export const {
  setConversations,
  setActiveConversation,
  setMessages,
  addMessage,
  upsertMessage,
  replaceTempMessage,
  removeMessage,
  updateLastMessage,
} = chatSlice.actions

export default chatSlice.reducer

export const selectConversations = (state) => state.chat.conversations
export const selectConversationsLoaded = (state) => state.chat.conversationsLoaded
export const selectActiveConversation = (state) => state.chat.activeConversation
export const selectMessages = (state) => state.chat.messages
