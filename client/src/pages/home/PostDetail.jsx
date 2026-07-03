import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { CircularProgress } from '@mui/material'
import PostCard from '../../components/post/PostCard'
import ErrorState from '../../components/common/ErrorState'
import { fetchPostById, selectPostById } from '../../redux/slices/postSlice'

// /post/:postId — deep-linkable single post page with comments open
const PostDetail = () => {
  const { postId } = useParams()
  const dispatch = useDispatch()
  const post = useSelector((state) => selectPostById(state, postId))
  const { loading, error } = useSelector((state) => state.posts)

  useEffect(() => {
    if (!post) dispatch(fetchPostById(postId))
  }, [postId, post, dispatch])

  if (post) {
    return (
      <div className="max-w-xl mx-auto py-4 px-4">
        <PostCard post={post} autoOpenComments />
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center py-20"><CircularProgress /></div>
  }

  return (
    <ErrorState
      message={error === 'Post not found' ? 'This post does not exist or was deleted.' : error}
      onRetry={() => dispatch(fetchPostById(postId))}
    />
  )
}

export default PostDetail
