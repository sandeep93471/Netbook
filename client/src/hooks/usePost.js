import { useSelector } from 'react-redux'
import { selectPostById, selectAllPosts, selectPostsLoading, selectHasMore } from '../redux/slices/postSlice'

export const usePost = (postId) => {
  const post = useSelector((state) => selectPostById(state, postId))
  const loading = useSelector(selectPostsLoading)
  return { post, loading }
}

export const usePosts = () => {
  const posts = useSelector(selectAllPosts)
  const loading = useSelector(selectPostsLoading)
  const hasMore = useSelector(selectHasMore)
  return { posts, loading, hasMore }
}
