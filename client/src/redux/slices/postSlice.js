import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit'
import api, { apiError } from '../../api/client'
import { uploadImage, uploadVideo } from '../../api/storage'
import { addComment, deleteComment } from './commentSlice'

const postsAdapter = createEntityAdapter({
  selectId: (post) => post.id,
  sortComparer: (a, b) => b.createdAt - a.createdAt, // newest first
})

const initialState = postsAdapter.getInitialState({
  loading: false,
  error: null,
  cursor: null,  // createdAt cursor for pagination
  hasMore: true,
})

// Create a new post — image uploads to Cloudinary first, server parses tags/mentions
export const createPost = createAsyncThunk(
  'posts/create',
  async ({ text, imageFile, videoFile, background, visibility = 'public' }, { rejectWithValue }) => {
    try {
      let imageURL = ''
      let videoURL = ''
      if (imageFile) imageURL = await uploadImage(imageFile, 'posts')
      if (videoFile) videoURL = await uploadVideo(videoFile, 'reels')
      const { data } = await api.post('/posts', { text, imageURL, videoURL, background, visibility })
      return data.post
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Fetch feed page — cursor pagination (server returns hasMore + next cursor)
export const fetchPosts = createAsyncThunk(
  'posts/fetch',
  async (payload, { getState, rejectWithValue }) => {
    try {
      void payload
      const { cursor } = getState().posts
      const { data } = await api.get('/posts', { params: cursor ? { cursor } : {} })
      return data // { posts, hasMore, cursor }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Facebook-style reactions — server returns the updated post
export const setReaction = createAsyncThunk(
  'posts/setReaction',
  async ({ postId, userId, type }, { rejectWithValue }) => {
    try {
      // type is already resolved by the caller (null = remove). Don't re-read
      // state here — the optimistic update runs first, so prev === type would
      // always DELETE instead of PUT.
      const { data } = !type
        ? await api.delete(`/posts/${postId}/reaction`)
        : await api.put(`/posts/${postId}/reaction`, { reaction: type })
      return { post: data.post }
    } catch (err) {
      return rejectWithValue({ postId, userId, message: apiError(err) })
    }
  }
)

// Legacy like toggle — now just the 'like' reaction
export const toggleLike = createAsyncThunk(
  'posts/toggleLike',
  async ({ postId, userId, isLiked }, { dispatch }) => {
    dispatch(setReactionOptimistic({ postId, userId, type: isLiked ? null : 'like' }))
    return dispatch(setReaction({ postId, userId, type: isLiked ? null : 'like' })).unwrap()
  }
)

// Edit own post — server re-parses hashtags/mentions/searchTerms
export const updatePost = createAsyncThunk(
  'posts/update',
  async ({ postId, text }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/posts/${postId}`, { text })
      return { id: postId, changes: data.post }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Delete own post — server cascades comments/notifications/reports atomically
export const deletePost = createAsyncThunk(
  'posts/delete',
  async (postId, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}`)
      return postId
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Fetch a single post — /post/:id deep links
export const fetchPostById = createAsyncThunk(
  'posts/fetchById',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/${postId}`)
      return data.post
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Fetch posts by id list — Saved page
export const fetchPostsByIds = createAsyncThunk(
  'posts/fetchByIds',
  async (ids, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/posts/batch', { ids })
      return data.posts
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Share/repost — server creates post + bumps shareCount + notifies atomically
export const sharePost = createAsyncThunk(
  'posts/share',
  async ({ post, caption }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${post.id}/share`, { caption })
      return data.post
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const fetchPostsByTag = createAsyncThunk(
  'posts/fetchByTag',
  async (tag, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/posts/tag/${tag}`)
      return data.posts
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const searchPosts = createAsyncThunk(
  'posts/search',
  async (term, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/posts/search', { params: { q: term } })
      return data.posts
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Report — server increments reportCount, auto-hides at 3
export const reportPost = createAsyncThunk(
  'posts/report',
  async ({ postId, reason }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/posts/${postId}/report`, { reason })
      return { postId, ...data }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearPosts: (state) => {
      postsAdapter.removeAll(state)
      state.cursor = null
      state.hasMore = true
    },
    addRealtimePost: (state, action) => {
      postsAdapter.upsertOne(state, action.payload)
    },
    likePostOptimistic: (state, action) => {
      const { postId, userId } = action.payload
      const post = state.entities[postId]
      if (!post) return
      const likes = post.likes.includes(userId)
        ? post.likes.filter((id) => id !== userId)
        : [...post.likes, userId]
      postsAdapter.updateOne(state, { id: postId, changes: { likes } })
    },
    setReactionOptimistic: (state, action) => {
      const { postId, userId, type } = action.payload
      const post = state.entities[postId]
      if (!post) return
      const reactions = { ...(post.reactions || {}) }
      if (type) reactions[userId] = type
      else delete reactions[userId]
      const likes = type
        ? (post.likes.includes(userId) ? post.likes : [...post.likes, userId])
        : post.likes.filter((id) => id !== userId)
      postsAdapter.updateOne(state, { id: postId, changes: { reactions, likes } })
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPost.pending, (state) => { state.loading = true })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false
        postsAdapter.addOne(state, action.payload)
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchPosts.pending, (state) => { state.loading = true })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false
        postsAdapter.upsertMany(state, action.payload.posts)
        state.cursor = action.payload.cursor
        state.hasMore = action.payload.hasMore
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(toggleLike.rejected, (state, action) => {
        const { postId, userId } = action.payload
        const post = state.entities[postId]
        if (post) {
          post.likes = post.likes.includes(userId)
            ? post.likes.filter((id) => id !== userId)
            : [...post.likes, userId]
        }
      })
      .addCase(setReaction.fulfilled, (state, action) => {
        postsAdapter.upsertOne(state, action.payload.post)
      })
      .addCase(setReaction.rejected, (state, action) => {
        const { postId, userId } = action.payload
        const post = state.entities[postId]
        if (!post) return
        const reactions = { ...(post.reactions || {}) }
        const had = !!reactions[userId]
        if (had) delete reactions[userId]
        else reactions[userId] = 'like'
        const likes = had
          ? post.likes.filter((id) => id !== userId)
          : [...post.likes, userId]
        postsAdapter.updateOne(state, { id: postId, changes: { reactions, likes } })
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        postsAdapter.updateOne(state, { id: action.payload.id, changes: action.payload.changes })
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        postsAdapter.removeOne(state, action.payload)
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        postsAdapter.upsertOne(state, action.payload)
      })
      .addCase(fetchPostsByIds.fulfilled, (state, action) => {
        postsAdapter.upsertMany(state, action.payload)
      })
      .addCase(sharePost.fulfilled, (state, action) => {
        postsAdapter.addOne(state, action.payload)
        const orig = state.entities[action.payload.sharedFrom?.id]
        if (orig) orig.shareCount = (orig.shareCount || 0) + 1
      })
      .addCase(fetchPostsByTag.fulfilled, (state, action) => {
        postsAdapter.upsertMany(state, action.payload)
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        postsAdapter.upsertMany(state, action.payload)
      })
      .addCase(reportPost.fulfilled, (state, action) => {
        const { postId, ...updates } = action.payload
        postsAdapter.updateOne(state, { id: postId, changes: updates })
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const post = state.entities[action.payload.postId]
        if (post) post.commentCount += 1
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const post = state.entities[action.payload.postId]
        if (post) post.commentCount = Math.max(0, post.commentCount - 1)
      })
  },
})

export const { clearPosts, addRealtimePost, likePostOptimistic, setReactionOptimistic } = postSlice.actions
export default postSlice.reducer

export const {
  selectAll: selectAllPosts,
  selectById: selectPostById,
  selectIds: selectPostIds,
} = postsAdapter.getSelectors((state) => state.posts)

export const selectPostsLoading = (state) => state.posts.loading
export const selectHasMore = (state) => state.posts.hasMore
