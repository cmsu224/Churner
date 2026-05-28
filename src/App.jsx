import { HashRouter } from 'react-router-dom'
import { ChurnProvider } from './store/ChurnContext'
import { useGist } from './hooks/useGist'
import GistSetup from './components/Setup/GistSetup'
import AppShell from './components/layout/AppShell'
import { useState, useEffect, Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#f87171', background: '#09090b', minHeight: '100vh' }}>
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>{String(this.state.error)}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <HashRouter>
        <AppInner />
      </HashRouter>
    </ErrorBoundary>
  )
}
