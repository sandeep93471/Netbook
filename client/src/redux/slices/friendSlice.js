import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { apiError } from '../../api/client'
import { fetchUserProfile } from './userSlice'

// Refreshes friends state — used after accept/unfriend and on socket events
export const refreshFriends = createAsyncThunk(
  'friends/refresh',
  async (_arg, { getState, dispatch }) => {
    const uid = getState().auth.user?.uid
    if (!uid) return null
    await Promise.all([
      dispatch(fetchFriendRequests(uid)),
      dispatch(fetchUserProfile(uid)), // keeps myProfile.friends in sync
    ])
    return null
  }
)

// GET /friends → { received, sent, friends } — normalized to old doc shape
export const fetchFriendRequests = createAsyncThunk(
  'friends/fetch',
  async (_uid, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/friends')
      const normReq = (r, dir) => ({
        id: r.id,
        type: r.type || 'friend',
        from: dir === 'received' ? r.from.uid : r.from,
        to: dir === 'sent' ? r.to.uid : r.to,
        fromName: dir === 'received' ? r.from.displayName : undefined,
        fromPhoto: dir === 'received' ? r.from.photoURL : undefined,
        toName: dir === 'sent' ? r.to.displayName : undefined,
        toPhoto: dir === 'sent' ? r.to.photoURL : undefined,
        status: 'pending',
        createdAt: r.createdAt,
      })
      return {
        sent: data.sent.map((r) => normReq(r, 'sent')),
        received: data.received.map((r) => normReq(r, 'received')),
        friends: data.friends,
      }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Optimistic: the button flips to "Request sent" instantly; if the server
// rejects, the temp request is removed and the error surfaces.
export const sendFriendRequest = createAsyncThunk(
  'friends/send',
  async ({ to, toName }, { getState, dispatch, rejectWithValue }) => {
    const me = getState().auth.user
    const tempId = `temp-${to}`
    dispatch(addOptimisticSent({
      id: tempId, from: me.uid, to,
      fromName: me.displayName, fromPhoto: me.photoURL || '',
      toName: toName || '', status: 'pending', createdAt: Date.now(),
    }))
    try {
      const { data } = await api.post(`/friends/request/${to}`)
      dispatch(replaceRequestId({ tempId, realId: data.requestId }))
      return null
    } catch (err) {
      dispatch(removeRequestById(tempId))
      return rejectWithValue(apiError(err))
    }
  }
)

export const cancelFriendRequest = createAsyncThunk(
  'friends/cancel',
  async (requestId, { dispatch, rejectWithValue }) => {
    dispatch(removeRequestById(requestId))
    // Temp request still in flight — the local removal is all we can do
    if (String(requestId).startsWith('temp-')) return requestId
    try {
      await api.delete(`/friends/request/${requestId}`)
      return requestId
    } catch (err) {
      dispatch(fetchFriendRequests()) // restore authoritative state
      return rejectWithValue(apiError(err))
    }
  }
)

export const acceptFriendRequest = createAsyncThunk(
  'friends/accept',
  async ({ requestId, from, to }, { dispatch, rejectWithValue }) => {
    // Optimistic: move request → friends list immediately
    dispatch(applyAccept({ requestId }))
    try {
      await api.post(`/friends/accept/${requestId}`)
      dispatch(refreshFriends()) // background sync — real names/photos
      return { requestId, from, to }
    } catch (err) {
      dispatch(fetchFriendRequests())
      return rejectWithValue(apiError(err))
    }
  }
)

export const unfriend = createAsyncThunk(
  'friends/unfriend',
  async ({ uid, targetId }, { dispatch, rejectWithValue }) => {
    dispatch(removeFriendById(targetId))
    try {
      await api.delete(`/friends/${targetId}`)
      dispatch(refreshFriends())
      return { uid, targetId }
    } catch (err) {
      dispatch(refreshFriends())
      return rejectWithValue(apiError(err))
    }
  }
)

const friendSlice = createSlice({
  name: 'friends',
  initialState: { sent: [], received: [], friends: [], loading: false, error: null },
  reducers: {
    addOptimisticSent(state, action) {
      state.sent.push(action.payload)
    },
    replaceRequestId(state, action) {
      const req = state.sent.find((r) => r.id === action.payload.tempId)
      if (req) req.id = action.payload.realId
    },
    removeRequestById(state, action) {
      const id = action.payload
      state.sent = state.sent.filter((r) => r.id !== id)
      state.received = state.received.filter((r) => r.id !== id)
    },
    applyAccept(state, action) {
      const req = state.received.find((r) => r.id === action.payload.requestId)
      state.received = state.received.filter((r) => r.id !== action.payload.requestId)
      state.sent = state.sent.filter((r) => r.id !== action.payload.requestId)
      if (req && !state.friends.some((f) => (f.uid || f) === req.from)) {
        state.friends.push({
          uid: req.from,
          displayName: req.fromName || 'Friend',
          photoURL: req.fromPhoto || '',
        })
      }
    },
    removeFriendById(state, action) {
      state.friends = state.friends.filter((f) => (f.uid || f) !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFriendRequests.pending, (state) => { state.loading = true })
      .addCase(fetchFriendRequests.fulfilled, (state, action) => {
        state.loading = false
        state.sent = action.payload.sent
        state.received = action.payload.received
        state.friends = action.payload.friends
      })
      .addCase(fetchFriendRequests.rejected, (state, action) => {
        state.loading = false; state.error = action.payload
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const {
  addOptimisticSent, replaceRequestId, removeRequestById, applyAccept, removeFriendById,
} = friendSlice.actions

export default friendSlice.reducer

// Derive relationship state with a target user
export const selectFriendship = (state, targetUid) => {
  const myUid = state.auth.user?.uid
  const me = state.users.entities[myUid]
  const target = state.users.entities[targetUid]
  if (me?.friends?.includes(targetUid)) return { status: 'friends' }
  if (state.friends.friends?.some((f) => (f.uid || f) === targetUid)) return { status: 'friends' }
  const sentReq = state.friends.sent.find((r) => r.to === targetUid)
  if (sentReq) return { status: 'sent', request: sentReq }
  const recReq = state.friends.received.find((r) => r.from === targetUid)
  if (recReq) return { status: 'received', request: recReq }
  if (target?.friends?.includes(myUid)) return { status: 'friends' }
  return { status: 'none' }
}
