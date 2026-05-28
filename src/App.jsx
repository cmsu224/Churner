import { HashRouter } from 'react-router-dom'
import { ChurnProvider } from './store/ChurnContext'
import { useGist } from './hooks/useGist'
import GistSetup from './components/Setup/GistSetup'
import AppShell from './components/layout/AppShell'
import { useState, useEffect } from 'react'

function AppInner() {
  const gist = useGist()
  const [configured, setConfigured] = useState(gist.isConfigured)

  useEffect(() => {
    setConfigured(gist.isConfigured)
  }, [gist.isConfigured])

  if (!configured) {
    return <GistSetup onConfigured={() => setConfigured(true)} />
  }

  return (
    <ChurnProvider>
      <AppShell />
    </ChurnProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  )
}
