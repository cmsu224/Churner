import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import { hydrateCredentials } from './native/credentials'
import './index.css'

// Native polish: match the OS status bar to the app's current theme. Best-effort
// and dynamically imported so the plugin never touches the web bundle.
async function initNativeChrome() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const dark = document.documentElement.classList.contains('dark')
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
  } catch { /* ignore */ }
}

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Credentials must be hydrated from secure storage before the first render so
// gist.isConfigured is correct on mount. Render regardless if hydration fails.
hydrateCredentials().catch(() => {}).finally(() => {
  render()
  initNativeChrome()
})
