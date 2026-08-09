import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Typography, CircularProgress } from '@mui/material'
import PostCard from '../../components/post/PostCard'
import EmptyState from '../../components/common/EmptyState'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'
import { fetchPostsByIds, selectPostById } from '../../redux/slices/postSlice'
import BookmarkIcon from '@mui/icons-material/Bookmark'

const SavedPost = ({ postId }) => {
  const post = useSelector((state) => selectPostById(state, postId))
  return post ? <PostCard post={post} /> : null
}

const Saved = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => selectUserById(state, user?.uid))
  const savedIds = myProfile?.savedPosts || []

  // Ensure my profile (with savedPosts) is loaded, then fetch the posts
  useEffect(() => {
    if (user?.uid && !myProfile) dispatch(fetchUserProfile(user.uid))
  }, [dispatch, user?.uid, myProfile])

  useEffect(() => {
    if (savedIds.length) dispatch(fetchPostsByIds(savedIds))
  }, [dispatch, savedIds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-xl mx-auto py-4 px-4">
      <Typography variant="h5" className="font-bold mb-4">Saved posts</Typography>

      {!myProfile ? (
        <div className="flex justify-center py-20"><CircularProgress /></div>
      ) : savedIds.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon />}
          title="Nothing saved yet"
          description="Tap the bookmark icon on any post to save it here for later."
        />
      ) : (
        savedIds.map((id) => <SavedPost key={id} postId={id} />)
      )}
    </div>
  )
}

export default Saved
