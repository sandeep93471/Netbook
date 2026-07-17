import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Typography, Avatar, Button, Paper, Tabs, Tab, CircularProgress } from '@mui/material'
import { useState } from 'react'
import EmptyState from '../../components/common/EmptyState'
import PeopleIcon from '@mui/icons-material/People'
import {
  fetchFriendRequests, acceptFriendRequest, cancelFriendRequest, unfriend,
} from '../../redux/slices/friendSlice'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'

const UserRow = ({ uid, actions }) => {
  const dispatch = useDispatch()
  const profile = useSelector((state) => selectUserById(state, uid))
  useEffect(() => {
    if (!profile) dispatch(fetchUserProfile(uid))
  }, [uid, profile, dispatch])
  if (!profile) return <CircularProgress size={20} />
  return (
    <div className="flex items-center justify-between py-2">
      <Link to={`/profile/${uid}`} className="flex items-center gap-3 no-underline text-black dark:text-white min-w-0">
        <Avatar src={profile.photoURL}>{profile.displayName?.charAt(0)}</Avatar>
        <Typography className="font-medium truncate">{profile.displayName}</Typography>
      </Link>
      <div className="flex gap-2">{actions}</div>
    </div>
  )
}

const Friends = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { sent, received, loading } = useSelector((state) => state.friends)
  const myProfile = useSelector((state) => selectUserById(state, user?.uid))
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (user?.uid) dispatch(fetchFriendRequests(user.uid))
  }, [dispatch, user?.uid])

  const friendIds = myProfile?.friends || []

  return (
    <div className="max-w-xl mx-auto py-4 px-4">
      <Typography variant="h5" className="font-bold mb-3">Friends</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} className="mb-4">
        <Tab label={`Requests (${received.length})`} />
        <Tab label={`Sent (${sent.length})`} />
        <Tab label={`All friends (${friendIds.length})`} />
      </Tabs>

      <Paper className="p-4 rounded-xl">
        {loading && <div className="flex justify-center py-6"><CircularProgress /></div>}

        {!loading && tab === 0 && (
          received.length === 0 ? (
            <EmptyState icon={<PeopleIcon />} title="No requests" description="When someone sends you a friend request it appears here." />
          ) : (
            received.map((r) => (
              <UserRow
                key={r.id}
                uid={r.from}
                actions={
                  <>
                    <Button size="small" variant="contained"
                      onClick={() => dispatch(acceptFriendRequest({ requestId: r.id, from: r.from, to: r.to }))}>
                      Accept
                    </Button>
                    <Button size="small" variant="outlined"
                      onClick={() => dispatch(cancelFriendRequest(r.id))}>
                      Decline
                    </Button>
                  </>
                }
              />
            ))
          )
        )}

        {!loading && tab === 1 && (
          sent.length === 0 ? (
            <EmptyState icon={<PeopleIcon />} title="Nothing sent" description="Friend requests you send will show up here." />
          ) : (
            sent.map((r) => (
              <UserRow
                key={r.id}
                uid={r.to}
                actions={
                  <Button size="small" variant="outlined"
                    onClick={() => dispatch(cancelFriendRequest(r.id))}>
                    Cancel
                  </Button>
                }
              />
            ))
          )
        )}

        {!loading && tab === 2 && (
          friendIds.length === 0 ? (
            <EmptyState icon={<PeopleIcon />} title="No friends yet" description="Add friends from their profile pages." />
          ) : (
            friendIds.map((id) => (
              <UserRow
                key={id}
                uid={id}
                actions={
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => dispatch(unfriend({ uid: user.uid, targetId: id }))}>
                    Unfriend
                  </Button>
                }
              />
            ))
          )
        )}
      </Paper>
    </div>
  )
}

export default Friends
