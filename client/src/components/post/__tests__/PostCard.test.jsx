import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { BrowserRouter } from 'react-router-dom'
import PostCard from '../PostCard'

// Helper: render component with Redux provider + router
const renderWithProviders = (ui) => {
  const store = configureStore({
    reducer: {
      auth: () => ({ user: { uid: '123', displayName: 'Me' }, isAuthenticated: true }),
      posts: () => ({ entities: {}, ids: [], loading: false }),
      users: () => ({ entities: {}, ids: [] }),
    },
  })
  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  )
}

describe('PostCard', () => {
  const mockPost = {
    id: 'post1',
    text: 'Hello world!',
    displayName: 'John Doe',
    photoURL: '',
    userId: 'user1',
    likes: [],
    commentCount: 0,
    createdAt: Date.now(),
  }

  it('renders the post text', () => {
    renderWithProviders(<PostCard post={mockPost} />)
    expect(screen.getByText('Hello world!')).toBeInTheDocument()
  })

  it('renders the author name', () => {
    renderWithProviders(<PostCard post={mockPost} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('hides the reaction summary when there is no activity', () => {
    renderWithProviders(<PostCard post={mockPost} />)
    expect(screen.queryByText(/comments?/)).not.toBeInTheDocument()
  })

  it('shows like count when post is liked', () => {
    const likedPost = { ...mockPost, likes: ['u1', 'u2', '123'], reactions: { u1: 'like', u2: 'love', 123: 'like' } }
    renderWithProviders(<PostCard post={likedPost} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    // 👍 appears in both the summary chip and the Like button — expect ≥1 of each
    expect(screen.getAllByText('👍').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('❤️').length).toBeGreaterThanOrEqual(1)
  })

  it('links author name to their profile', () => {
    renderWithProviders(<PostCard post={mockPost} />)
    const nameLink = screen.getByText('John Doe').closest('a')
    expect(nameLink).toHaveAttribute('href', '/profile/user1')
  })
})
