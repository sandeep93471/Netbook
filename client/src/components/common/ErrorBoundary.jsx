import { Component } from 'react'
import { Button, Paper, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Paper elevation={2} className="p-8 text-center max-w-md">
            <ErrorOutlineIcon className="text-red-500" sx={{ fontSize: 64 }} />
            <Typography variant="h5" className="mt-4 font-bold">
              {this.props.title || 'Something went wrong'}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mt-2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button
              variant="contained"
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
            >
              Reload Page
            </Button>
          </Paper>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
