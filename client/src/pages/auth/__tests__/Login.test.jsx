import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { BrowserRouter } from 'react-router-dom'
import Login from '../Login'

const renderLogin = () => {
  const store = configureStore({
    reducer: {
      auth: () => ({ user: null, loading: false, error: null, isAuthenticated: false }),
    },
  })
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </Provider>
  )
}

describe('Login Page', () => {
  it('renders login form fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password\s*\*?$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('marks email and password as required', () => {
    renderLogin()
    expect(screen.getByLabelText(/email address/i)).toBeRequired()
    expect(screen.getByLabelText(/^password\s*\*?$/i)).toBeRequired()
  })

  it('has link to register page', () => {
    renderLogin()
    const link = screen.getByRole('link', { name: /create account/i })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('has Google sign-in button', () => {
    renderLogin()
    expect(screen.getByText(/continue with google/i)).toBeInTheDocument()
  })
})
