import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { apiError } from '../../api/client'
import { uploadImage } from '../../api/storage'

export const fetchComments = createAsyncThunk(
  'comments/fetch',
  async (postId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/comments/${postId}`)
      return { postId, comments: data.comments }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Photo + replies supported — server bumps commentCount and notifies
export const addComment = createAsyncThunk(
  'comments/add',
  async ({ postId, text, imageFile, parentCommentId }, { rejectWithValue }) => {
    try {
      let imageURL = ''
      if (imageFile) imageURL = await uploadImage(imageFile, 'comments')
      const { data } = await api.post(`/comments/${postId}`, {
        text, imageURL, parentCommentId: parentCommentId || null,
      })
      return { postId, comment: data.comment }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

export const likeComment = createAsyncThunk(
  'comments/like',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/comments/${commentId}/like`)
      return { postId, comment: data.comment }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

// Deletes the comment + its replies; server returns removedCount
export const deleteComment = createAsyncThunk(
  'comments/delete',
  async ({ postId, commentId }, { getState, rejectWithValue }) => {
    try {
      const comments = getState().comments.byPostId[postId] || []
      const replyIds = comments.filter((c) => c.parentCommentId === commentId).map((c) => c.id)
      await api.delete(`/comments/${commentId}`)
      return { postId, commentId, replyIds }
    } catch (err) {
      return rejectWithValue(apiError(err))
    }
  }
)

const commentSlice = createSlice({
  name: 'comments',
  initialState: {
    byPostId: {},
    loading: false,
    error: null,
  },
  reducers: {
    likeCommentOptimistic: (state, action) => {
      const { postId, commentId, userId } = action.payload
      const comment = (state.byPostId[postId] || []).find((c) => c.id === commentId)
      if (!comment) return
      const likes = comment.likes || []
      comment.likes = likes.includes(userId)
        ? likes.filter((id) => id !== userId)
        : [...likes, userId]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComments.pending, (state) => { state.loading = true })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false
        state.byPostId[action.payload.postId] = action.payload.comments
      })
      .addCase(fetchComments.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(addComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload
        if (!state.byPostId[postId]) state.byPostId[postId] = []
        state.byPostId[postId].push(comment)
      })
      .addCase(likeComment.fulfilled, (state, action) => {
        const { postId, comment } = action.payload
        const list = state.byPostId[postId] || []
        const idx = list.findIndex((c) => c.id === comment.id)
        if (idx !== -1) list[idx] = comment
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId, replyIds } = action.payload
        if (state.byPostId[postId]) {
          const removed = new Set([commentId, ...replyIds])
          state.byPostId[postId] = state.byPostId[postId].filter((c) => !removed.has(c.id))
        }
      })
  },
})

export const { likeCommentOptimistic } = commentSlice.actions
export default commentSlice.reducer

export const selectCommentsByPostId = (postId) => (state) => state.comments.byPostId[postId] || []
export const selectCommentsLoading = (state) => state.comments.loading
