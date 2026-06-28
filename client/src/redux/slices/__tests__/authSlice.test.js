import { describe, it, expect } from 'vitest'
import authReducer, { setUser, clearError } from '../authSlice'

const initialState = {
  user: null,
  loading: true, // true until the /me session check completes
  error: null,
  isAuthenticated: false,
}

describe('authSlice', () => {
  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should set user with setUser action', () => {
    const mockUser = { uid: '123', email: 'test@test.com', displayName: 'Test' }
    const state = authReducer(initialState, setUser(mockUser))
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear user when setUser(null)', () => {
    const loggedInState = {
      user: { uid: '123' },
      loading: false,
      error: null,
      isAuthenticated: true,
    }
    const state = authReducer(loggedInState, setUser(null))
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should clear error with clearError', () => {
    const errorState = { ...initialState, error: 'Something went wrong' }
    const state = authReducer(errorState, clearError())
    expect(state.error).toBeNull()
  })

  it('should set loading on registerUser.pending', () => {
    const action = { type: 'auth/register/pending' }
    const state = authReducer(initialState, action)
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('should store error on registerUser.rejected', () => {
    const action = { type: 'auth/register/rejected', payload: 'Email in use' }
    const state = authReducer(initialState, action)
    expect(state.loading).toBe(false)
    expect(state.error).toBe('Email in use')
  })

  it('should set user on loginUser.fulfilled', () => {
    const mockUser = { uid: '456', email: 'a@b.com', displayName: 'A' }
    const action = { type: 'auth/login/fulfilled', payload: mockUser }
    const state = authReducer(initialState, action)
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
  })
})
