import { createSelector } from '@reduxjs/toolkit'
import { selectAllPosts } from '../slices/postSlice'
import { selectAllUsers } from '../slices/userSlice'

// Derived data: posts with author information merged in
export const selectPostsWithAuthors = createSelector(
  [selectAllPosts, selectAllUsers],
  (posts, users) => {
    return posts.map((post) => ({
      ...post,
      author: users.find((u) => u.uid === post.userId),
    }))
  }
)

// Derived data: posts by a specific user
// Parameterized selector — memoization works because userId is an input
export const selectPostsByUserId = createSelector(
  [selectAllPosts, (state, userId) => userId],
  (posts, userId) => posts.filter((post) => post.userId === userId)
)

// Derived data: posts liked by current user
export const selectLikedPosts = createSelector(
  [selectAllPosts, (state, userId) => userId],
  (posts, userId) => posts.filter((post) => post.likes?.includes(userId))
)

// Stats: total posts, total likes across all posts
export const selectFeedStats = createSelector([selectAllPosts], (posts) => ({
  totalPosts: posts.length,
  totalLikes: posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0),
  totalComments: posts.reduce((sum, p) => sum + (p.commentCount || 0), 0),
}))
