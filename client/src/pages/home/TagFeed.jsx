import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Typography, CircularProgress } from '@mui/material'
import PostCard from '../../components/post/PostCard'
import EmptyState from '../../components/common/EmptyState'
import TagIcon from '@mui/icons-material/Tag'
import { fetchPostsByTag, selectAllPosts } from '../../redux/slices/postSlice'

const TagFeed = () => {
  const { tag } = useParams()
  const dispatch = useDispatch()
  const [result, setResult] = useState(null) // { tag, ids }
  const { loading } = useSelector((state) => state.posts)
  const allPosts = useSelector(selectAllPosts)

  useEffect(() => {
    let active = true
    dispatch(fetchPostsByTag(tag)).then((res) => {
      if (active && res.payload) setResult({ tag, ids: res.payload.map((p) => p.id) })
    })
    return () => { active = false }
  }, [tag, dispatch])

  const fetched = result?.tag === tag
  const posts = (fetched ? result.ids : [])
    .map((id) => allPosts.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <div className="max-w-xl mx-auto py-4 px-4">
      <div className="flex items-center gap-2 mb-4">
        <TagIcon className="text-[#1976d2]" />
        <Typography variant="h5" className="font-bold">#{tag}</Typography>
      </div>

      {!fetched || loading ? (
        <div className="flex justify-center py-20"><CircularProgress /></div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<TagIcon />}
          title={`No posts with #${tag}`}
          description="Be the first to post with this hashtag."
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  )
}

export default TagFeed
