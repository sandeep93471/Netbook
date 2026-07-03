import { Paper, Typography, Button } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'

const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <Paper elevation={0} className="p-8 text-center">
    <ErrorOutlineIcon className="text-gray-400" sx={{ fontSize: 48 }} />
    <Typography variant="body1" color="text.secondary" className="mt-2">
      {message}
    </Typography>
    {onRetry && (
      <Button variant="outlined" className="mt-4" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </Paper>
)

export default ErrorState
