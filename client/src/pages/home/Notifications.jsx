import { useDispatch, useSelector } from 'react-redux'
import { Typography, Avatar, Button, Paper } from '@mui/material'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import FavoriteIcon from '@mui/icons-material/Favorite'
import CommentIcon from '@mui/icons-material/Comment'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { useNavigate } from 'react-router-dom'
import { markRead, markAllRead, selectNotifications, selectUnreadCount } from '../../redux/slices/notificationSlice'
import { markNotificationRead } from '../../api/notifications'
import { timeAgo } from '../../utils/timeAgo'
import EmptyState from '../../components/common/EmptyState'
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff'

const notificationIcons = {
  like: <FavoriteIcon className="text-red-500" fontSize="small" />,
  comment: <CommentIcon className="text-blue-500" fontSize="small" />,
  reply: <CommentIcon className="text-blue-500" fontSize="small" />,
  friend_request: <PersonAddIcon className="text-purple-500" fontSize="small" />,
  friend_accept: <PersonAddIcon className="text-green-500" fontSize="small" />,
  share: <CommentIcon className="text-orange-500" fontSize="small" />,
}

const notificationText = {
  like: 'liked your post',
  comment: 'commented on your post',
  reply: 'replied to your comment',
  friend_request: 'sent you a friend request',
  friend_accept: 'accepted your friend request',
  share: 'shared your post',
}

const NotificationsPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const { user } = useSelector((state) => state.auth)

  const handleClick = (notif) => {
    if (!notif.read) {
      dispatch(markRead(notif.id))
      markNotificationRead(notif.id).catch(() => {})
    }
    if (notif.type === 'friend_request') {
      navigate('/friends')
    } else if (notif.postId) {
      navigate(`/post/${notif.postId}`)
    } else {
      navigate(`/profile/${notif.senderId}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5" className="font-bold">Notifications</Typography>
        {unreadCount > 0 && (
          <Button size="small" startIcon={<DoneAllIcon />}
            onClick={() => dispatch(markAllRead(user.uid))}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {notifications.map((notif) => (
          <Paper
            key={notif.id}
            elevation={0}
            className={`p-3 flex items-center gap-3 cursor-pointer rounded-xl ${!notif.read ? 'unread-tint' : ''}`}
            onClick={() => handleClick(notif)}
          >
            <Avatar src={notif.senderPhoto} sx={{ width: 40, height: 40 }}>
              {notif.senderName?.charAt(0)}
            </Avatar>
            <div className="flex-1 min-w-0">
              <Typography variant="body2">
                <strong>{notif.senderName}</strong>{' '}
                {notificationText[notif.type] || 'interacted with you'}
              </Typography>
              {notif.postText && (
                <Typography variant="caption" color="text.secondary" className="truncate block">
                  "{notif.postText}"
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {timeAgo(notif.createdAt)}
              </Typography>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {notificationIcons[notif.type]}
              {/* unread dot — tint + dot, never color alone */}
              {!notif.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A5CE0] dark:bg-[#4599FF]" aria-label="Unread" />
              )}
            </div>
          </Paper>
        ))}

        {notifications.length === 0 && (
          <EmptyState
            icon={<NotificationsOffIcon className="text-gray-300" sx={{ fontSize: 64 }} />}
            title="No notifications"
            description="When someone likes or comments on your post, it'll show up here"
          />
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
