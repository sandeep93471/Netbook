import { describe, it, expect } from 'vitest'
import postReducer, { likePostOptimistic, clearPosts } from '../postSlice'

const makeState = (posts) => ({
  ids: posts.map((p) => p.id),
  entities: Object.fromEntries(posts.map((p) => [p.id, p])),
  loading: false,
  error: null,
  cursor: null,
  hasMore: true,
})

const mockPost = {
  id: 'p1',
  text: 'Hi',
  userId: 'author',
  likes: [],
  commentCount: 0,
  createdAt: 1700000000000,
}

describe('postSlice — likePostOptimistic', () => {
  it('adds user to likes when not already liked', () => {
    const state = postReducer(makeState([mockPost]), likePostOptimistic({ postId: 'p1', userId: 'u1' }))
    expect(state.entities.p1.likes).toContain('u1')
    expect(state.entities.p1.likes).toHaveLength(1)
  })

  it('removes user from likes when already liked (unlike)', () => {
    const liked = makeState([{ ...mockPost, likes: ['u1', 'u2'] }])
    const state = postReducer(liked, likePostOptimistic({ postId: 'p1', userId: 'u1' }))
    expect(state.entities.p1.likes).not.toContain('u1')
    expect(state.entities.p1.likes).toEqual(['u2'])
  })

  it('does nothing for unknown postId', () => {
    const before = makeState([mockPost])
    const state = postReducer(before, likePostOptimistic({ postId: 'nope', userId: 'u1' }))
    expect(state.entities.p1.likes).toEqual([])
  })
})

describe('postSlice — clearPosts', () => {
  it('empties all posts and resets pagination', () => {
    const before = { ...makeState([mockPost]), hasMore: false, cursor: 1700000000000 }
    const state = postReducer(before, clearPosts())
    expect(state.ids).toHaveLength(0)
    expect(state.hasMore).toBe(true)
    expect(state.cursor).toBeNull()
  })
})
