import { useSelector } from 'react-redux'
import { selectPostById, selectFeedPosts, selectPostsLoading, selectHasMore } from '../redux/slices/postSlice'

export const usePost = (postId) => {
  const post = useSelector((state) => selectPostById(state, postId))
  const loading = useSelector(selectPostsLoading)
  return { post, loading }
}

export const usePosts = () => {
  const posts = useSelector(selectFeedPosts) // server-ranked order
  const loading = useSelector(selectPostsLoading)
  const hasMore = useSelector(selectHasMore)
  return { posts, loading, hasMore }
}
