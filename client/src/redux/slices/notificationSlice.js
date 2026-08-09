import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { apiError } from '../../api/client'

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications')
      return data.notifications
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_userId, { rejectWithValue }) => {
    try {
      await api.put('/notifications/read-all')
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    setNotifications: (state, action) => {
      state.items = action.payload
      state.unreadCount = action.payload.filter((n) => !n.read).length
    },
    addNotification: (state, action) => {
      state.items.unshift(action.payload)
      if (!action.payload.read) state.unreadCount++
    },
    markRead: (state, action) => {
      const notif = state.items.find((n) => n.id === action.payload)
      if (notif && !notif.read) {
        notif.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload
        state.unreadCount = action.payload.filter((n) => !n.read).length
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.read = true })
        state.unreadCount = 0
      })
  },
})

export const { setNotifications, addNotification, markRead } = notificationSlice.actions
export default notificationSlice.reducer

export const selectNotifications = (state) => state.notifications.items
export const selectUnreadCount = (state) => state.notifications.unreadCount
