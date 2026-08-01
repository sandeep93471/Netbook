import { Tooltip } from '@mui/material'
import { useUserStatus } from '../../hooks/usePresence'

// Renders an absolutely-positioned dot — wrap the parent (e.g. Avatar)
// in a `relative` container
const OnlineStatusDot = ({ userId, size = 12 }) => {
  const { status, lastSeen } = useUserStatus(userId)
  const isOnline = status === 'online'

  const lastSeenText = lastSeen
    ? `Last seen ${new Date(lastSeen).toLocaleString()}`
    : 'Offline'

  return (
    <Tooltip title={isOnline ? 'Online' : lastSeenText} arrow>
      <span
        className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
        style={{ width: size, height: size }}
      />
    </Tooltip>
  )
}

export default OnlineStatusDot
