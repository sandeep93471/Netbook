import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit'
import api, { apiError } from '../../api/client'
import { uploadImage } from '../../api/storage'

const usersAdapter = createEntityAdapter({
  selectId: (user) => user.uid,
})

const initialState = usersAdapter.getInitialState({
  currentProfile: null, // user being viewed on /profile/:id
  loading: false,
  error: null,
})

// Fetch a user's profile
export const fetchUserProfile = createAsyncThunk(
  'users/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/users/${userId}`)
      return data.user
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Server creates the user doc at registration — kept for API compatibility
export const createUserProfile = createAsyncThunk(
  'users/createProfile',
  async (user) => user
)

// Update profile — client uploads new images to Cloudinary, sends URLs
export const updateUserProfile = createAsyncThunk(
  'users/updateProfile',
  async ({ displayName, bio, avatarFile, coverFile, photoURL, coverURL, isPrivate }, { rejectWithValue }) => {
    try {
      const body = {}
      const historyAdds = []
      if (isPrivate !== undefined) body.isPrivate = isPrivate
      if (displayName !== undefined) Object.assign(body, { displayName, bio })
      if (avatarFile) body.photoURL = await uploadImage(avatarFile, 'avatars')
      if (coverFile) body.coverURL = await uploadImage(coverFile, 'covers')
      if (photoURL) body.photoURL = photoURL
      if (coverURL) body.coverURL = coverURL
      const { data } = await api.patch('/users/me', body)
      if (body.photoURL) historyAdds.push({ url: body.photoURL, type: 'avatar', at: Date.now() })
      if (body.coverURL) historyAdds.push({ url: body.coverURL, type: 'cover', at: Date.now() })
      return { ...data.user, _historyAdds: historyAdds }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Toggle a post bookmark
export const toggleSavePost = createAsyncThunk(
  'users/toggleSave',
  async ({ postId }, { getState, rejectWithValue }) => {
    try {
      const { data } = await api.put(`/users/me/saved/${postId}`)
      return { uid: getState().auth.user.uid, savedPosts: data.savedPosts }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Record a search term (deduped, capped at 10 server-side)
export const recordSearch = createAsyncThunk(
  'users/recordSearch',
  async ({ term }, { getState, rejectWithValue }) => {
    try {
      const { data } = await api.post('/users/me/search-history', { term })
      return { uid: getState().auth.user.uid, searchHistory: data.searchHistory }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Remove one search-history entry
export const removeSearch = createAsyncThunk(
  'users/removeSearch',
  async ({ term }, { getState, rejectWithValue }) => {
    try {
      const { data } = await api.delete(`/users/me/search-history/${encodeURIComponent(term)}`)
      return { uid: getState().auth.user.uid, searchHistory: data.searchHistory }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrentProfile: (state) => { state.currentProfile = null },
    // Optimistic bookmark toggle
    toggleSaved: (state, action) => {
      const { uid, postId } = action.payload
      const me = state.entities[uid]
      if (!me) return
      const saved = me.savedPosts || []
      me.savedPosts = saved.includes(postId)
        ? saved.filter((id) => id !== postId)
        : [...saved, postId]
    },
    friendLocal: (state, action) => {
      const { uid, targetId, add } = action.payload
      const apply = (u) => {
        if (!u) return
        u.friends = add
          ? [...new Set([...(u.friends || []), targetId === u.uid ? uid : targetId])]
          : (u.friends || []).filter((id) => id !== targetId && id !== uid)
      }
      apply(state.entities[uid])
      apply(state.entities[targetId])
      if (state.currentProfile?.uid === targetId || state.currentProfile?.uid === uid) {
        apply(state.currentProfile)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => { state.loading = true })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false
        usersAdapter.upsertOne(state, action.payload)
        state.currentProfile = action.payload
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createUserProfile.fulfilled, (state, action) => {
        usersAdapter.upsertOne(state, action.payload)
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        const { _historyAdds, ...user } = action.payload
        const existing = state.entities[user.uid]
        const merged = existing
          ? { ...existing, ...user, photoHistory: [...(existing.photoHistory || []), ..._historyAdds] }
          : user
        usersAdapter.upsertOne(state, merged)
        if (state.currentProfile?.uid === user.uid) {
          state.currentProfile = {
            ...state.currentProfile,
            ...user,
            photoHistory: [...(state.currentProfile.photoHistory || []), ..._historyAdds],
          }
        }
      })
      .addCase(toggleSavePost.fulfilled, (state, action) => {
        const me = state.entities[action.payload.uid]
        if (me) me.savedPosts = action.payload.savedPosts
        if (state.currentProfile?.uid === action.payload.uid) {
          state.currentProfile.savedPosts = action.payload.savedPosts
        }
      })
      .addCase(toggleSavePost.rejected, (state, action) => {
        // Roll back the optimistic toggle
        const { uid, postId } = action.meta.arg
        const me = state.entities[uid]
        if (me?.savedPosts) {
          me.savedPosts = me.savedPosts.includes(postId)
            ? me.savedPosts.filter((id) => id !== postId)
            : [...me.savedPosts, postId]
        }
      })
      .addCase(recordSearch.fulfilled, (state, action) => {
        const me = state.entities[action.payload.uid]
        if (me) me.searchHistory = action.payload.searchHistory
      })
      .addCase(removeSearch.fulfilled, (state, action) => {
        const me = state.entities[action.payload.uid]
        if (me) me.searchHistory = action.payload.searchHistory
      })
  },
})

export const { clearCurrentProfile, toggleSaved, friendLocal } = userSlice.actions
export default userSlice.reducer

export const {
  selectById: selectUserById,
  selectAll: selectAllUsers,
} = usersAdapter.getSelectors((state) => state.users)

export const selectCurrentProfile = (state) => state.users.currentProfile
export const selectUsersLoading = (state) => state.users.loading
export const selectUsersError = (state) => state.users.error
