import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Toaster } from 'react-hot-toast'
import App from '../../App'
import { getTheme } from '../../theme'
import { selectMode } from '../../redux/slices/uiSlice'
import ClickSpark from '../reactbits/ClickSpark'

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
      <ClickSpark sparkColor="#1877F2" sparkSize={10} sparkRadius={22} sparkCount={7} duration={450}>
        <App />
      </ClickSpark>
      <Toaster position="top-right" />
    </ThemeProvider>
  )
}

export default ThemedApp
