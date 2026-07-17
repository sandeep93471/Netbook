import { useDispatch, useSelector } from 'react-redux'
import { Button, Menu, MenuItem } from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import CheckIcon from '@mui/icons-material/Check'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import { useState } from 'react'
import {
  sendFriendRequest, cancelFriendRequest, acceptFriendRequest, unfriend, selectFriendship,
} from '../../redux/slices/friendSlice'

const FriendButton = ({ targetUserId, targetName }) => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { status, request } = useSelector((state) => selectFriendship(state, targetUserId))
  const [anchor, setAnchor] = useState(null)

  if (!user || user.uid === targetUserId) return null

  const add = () => dispatch(sendFriendRequest({
    from: user.uid, to: targetUserId,
    displayName: user.displayName, photoURL: user.photoURL, toName: targetName,
  }))

  if (status === 'friends') {
    return (
      <>
        <Button variant="outlined" size="small" startIcon={<CheckIcon />}
          onClick={(e) => setAnchor(e.currentTarget)}>
          Friends
        </Button>
        <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <MenuItem onClick={() => { dispatch(unfriend({ uid: user.uid, targetId: targetUserId })); setAnchor(null) }}>
            <PersonRemoveIcon fontSize="small" className="mr-2" /> Unfriend
          </MenuItem>
        </Menu>
      </>
    )
  }

  if (status === 'sent') {
    return (
      <Button variant="outlined" size="small" startIcon={<HourglassTopIcon />}
        onClick={() => dispatch(cancelFriendRequest(request.id))}>
        Request sent
      </Button>
    )
  }

  if (status === 'received') {
    return (
      <div className="flex gap-2">
        <Button variant="contained" size="small" startIcon={<CheckIcon />}
          onClick={() => dispatch(acceptFriendRequest({ requestId: request.id, from: request.from, to: request.to }))}>
          Accept
        </Button>
        <Button variant="outlined" size="small"
          onClick={() => dispatch(cancelFriendRequest(request.id))}>
          Decline
        </Button>
      </div>
    )
  }

  return (
    <Button variant="contained" size="small" startIcon={<PersonAddIcon />} onClick={add}>
      Add friend
    </Button>
  )
}

export default FriendButton
