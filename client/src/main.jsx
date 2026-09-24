import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ThemedApp from './components/common/ThemedApp'
import { store, persistor } from './redux/store'
import '@fontsource-variable/inter' // self-hosted Inter — consistent on all OSes
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Stale-chunk recovery: if a lazy-loaded page fails because a new deploy
// replaced the files while the app was open, reload once to get the new build.
window.addEventListener('unhandledrejection', (e) => {
  const msg = String(e.reason?.message || e.reason || '')
  if (msg.includes('dynamically imported module') || msg.includes('Failed to fetch')) {
    if (!sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.reload()
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <BrowserRouter>
            <ThemedApp />
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
