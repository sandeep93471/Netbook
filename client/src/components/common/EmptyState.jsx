import { Paper, Typography } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

const EmptyState = ({ icon, title = 'Nothing here yet', description }) => (
  <Paper elevation={0} className="p-12 text-center">
    {icon || <InboxIcon className="text-gray-300" sx={{ fontSize: 64 }} />}
    <Typography variant="h6" color="text.secondary" className="mt-4">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" className="mt-1">
        {description}
      </Typography>
    )}
  </Paper>
)

export default EmptyState
