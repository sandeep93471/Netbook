import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logout,
} from '../../api/auth'
import { fetchUserProfile } from './userSlice'
import { closeSocket } from '../../api/socket'
import { apiError } from '../../api/client'

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password, displayName, dob, gender }, { dispatch, rejectWithValue }) => {
    try {
      const user = await registerWithEmail(email, password, displayName, dob, gender)
      dispatch(fetchUserProfile(user.uid))
      return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, emailVerified: user.verified }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      const cred = await loginWithEmail(email, password)
      dispatch(fetchUserProfile(cred.user.uid))
      return { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName, photoURL: cred.user.photoURL, emailVerified: cred.user.verified }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const loginWithGoogleThunk = createAsyncThunk(
  'auth/loginGoogle',
  async (credential, { dispatch, rejectWithValue }) => {
    try {
      const user = await loginWithGoogle(credential)
      dispatch(fetchUserProfile(user.uid))
      return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, emailVerified: user.verified }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logout()
      closeSocket()
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: true, // true until the /me check completes
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
      state.loading = false
    },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null }
    const rejected = (state, action) => { state.loading = false; state.error = action.payload }
    const fulfilled = (state, action) => {
      state.loading = false
      state.isAuthenticated = true
      state.user = action.payload
    }
    builder
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, fulfilled)
      .addCase(registerUser.rejected, rejected)
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, fulfilled)
      .addCase(loginUser.rejected, rejected)
      .addCase(loginWithGoogleThunk.pending, pending)
      .addCase(loginWithGoogleThunk.fulfilled, fulfilled)
      .addCase(loginWithGoogleThunk.rejected, rejected)
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { setUser, clearError } = authSlice.actions
export default authSlice.reducer
