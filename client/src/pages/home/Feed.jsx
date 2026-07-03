import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { CircularProgress, Button, Tabs, Tab, Paper, Typography } from '@mui/material'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import ExploreIcon from '@mui/icons-material/Explore'
import { Link } from 'react-router-dom'
import CreatePost from '../../components/post/CreatePost'
import PostCard from '../../components/post/PostCard'
import StoryBar from '../../components/post/StoryBar'
import { PostSkeleton } from '../../components/common/SkeletonLoader'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { fetchPosts } from '../../redux/slices/postSlice'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'
import { usePosts } from '../../hooks/usePost'

const Feed = () => {
  const dispatch = useDispatch()
  const { posts, loading, hasMore } = usePosts()
  const error = useSelector((state) => state.posts.error)
  const { user } = useSelector((state) => state.auth)
  const myProfile = useSelector((state) => (user ? selectUserById(state, user.uid) : null))
  const [tab, setTab] = useState(() => Number(sessionStorage.getItem('feedTab')) || 0)

  useEffect(() => {
    if (posts.length === 0) dispatch(fetchPosts())
  }, [dispatch, posts.length])

  // Load own profile so we know who we friend
  useEffect(() => {
    if (user?.uid && !myProfile) dispatch(fetchUserProfile(user.uid))
  }, [dispatch, user?.uid, myProfile])

  // Persist tab across in-session navigation
  useEffect(() => { sessionStorage.setItem('feedTab', String(tab)) }, [tab])

  // Scroll restoration — keep place when returning from a post (NN/g: users
  // lose their place in infinite lists after Back)
  useEffect(() => {
    const saved = sessionStorage.getItem('feedScrollY')
    if (saved) {
      sessionStorage.removeItem('feedScrollY')
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }
    return () => sessionStorage.setItem('feedScrollY', String(window.scrollY))
  }, [])

  const friends = myProfile?.friends || []
  const closeFriends = myProfile?.closeFriends || []
  const filteredPosts = (
    tab === 0 ? posts
    : tab === 1 ? posts.filter((p) => friends.includes(p.userId))
    : posts.filter((p) => closeFriends.includes(p.userId) || p.visibility === 'closefriends')
  ).filter((p) => !p.hidden)

  const loadMore = () => {
    if (!loading && hasMore) dispatch(fetchPosts())
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        className="mb-4"
        role="tablist"
        aria-label="Feed filters"
      >
        <Tab label="For You" />
        <Tab label="Friends" />
        <Tab label="Close Friends" />
      </Tabs>

      <StoryBar />

      <CreatePost />

      {/* ARIA feed pattern — assistive tech understands this is a post stream */}
      <section role="feed" aria-busy={loading} aria-label="Posts">
        {filteredPosts.map((post, i) => (
          <PostCard key={post.id} post={post} index={i} />
        ))}
      </section>

      {error && !loading && posts.length === 0 && (
        <ErrorState message={error} onRetry={() => dispatch(fetchPosts())} />
      )}

      {tab === 0 && !loading && !error && posts.length === 0 && (
        <EmptyState title="No posts yet" description="Be the first to post!" />
      )}

      {tab === 1 && filteredPosts.length === 0 && !loading && (
        <EmptyState
          title="Nothing from friends yet"
          description='Add friends or switch to "For You" to see everything.'
        />
      )}

      {tab === 2 && filteredPosts.length === 0 && !loading && (
        <EmptyState
          title="No close friends posts"
          description='Posts shared with "Close friends" show up here.'
        />
      )}

      {loading && posts.length === 0 && (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4" aria-label="Loading more posts">
          <CircularProgress />
        </div>
      )}

      {hasMore && !loading && (
        <div className="flex justify-center py-4">
          <Button onClick={loadMore} variant="outlined">Load More</Button>
        </div>
      )}

      {/* End-of-feed stopping cue — a natural stopping point instead of
          endless scroll (HCI wellbeing research) */}
      {!hasMore && !loading && filteredPosts.length > 0 && (
        <Paper elevation={0} className="p-6 text-center mt-2 mb-4">
          <DoneAllIcon sx={{ color: 'success.main', fontSize: 40 }} />
          <Typography variant="subtitle1" className="font-bold mt-1">
            You're all caught up
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mb-3">
            You've seen everything for now.
          </Typography>
          <Button component={Link} to="/explore" variant="outlined" size="small" startIcon={<ExploreIcon />}>
            Explore more
          </Button>
        </Paper>
      )}
    </div>
  )
}

export default Feed
