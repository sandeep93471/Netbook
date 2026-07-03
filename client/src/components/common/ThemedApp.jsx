import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'react-hot-toast'
import App from '../../App'
import { getTheme } from '../../theme'
import { selectMode } from '../../redux/slices/uiSlice'

// Reads dark/light mode from Redux, syncs the .dark class for Tailwind
// dark: variants, and provides the matching MUI theme.
const ThemedApp = () => {
  const mode = useSelector(selectMode)
  const theme = useMemo(() => getTheme(mode), [mode])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
      <Toaster position="top-right" />
    </ThemeProvider>
  )
}

export default ThemedApp
