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
  updateLastMessage,
} = chatSlice.actions

export default chatSlice.reducer

export const selectConversations = (state) => state.chat.conversations
export const selectConversationsLoaded = (state) => state.chat.conversationsLoaded
export const selectActiveConversation = (state) => state.chat.activeConversation
export const selectMessages = (state) => state.chat.messages
