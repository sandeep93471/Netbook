import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the API client — no network calls in tests
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
  apiError: (err) => err?.message || 'Error',
}))

// Google OAuth components need a provider — stub them for tests
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => 'Continue with Google',
  GoogleOAuthProvider: ({ children }) => children,
  useGoogleLogin: () => vi.fn(),
}))
