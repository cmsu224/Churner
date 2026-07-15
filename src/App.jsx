import { HashRouter } from 'react-router-dom'
import { ChurnProvider } from './store/ChurnContext'
import { useGist } from './hooks/useGist'
import GistSetup from './components/Setup/GistSetup'
import AppShell from './components/layout/AppShell'
import { useState, Component } from 'react'

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
        <div className="min-h-screen bg-base p-8 font-mono text-danger-ink">
          <h2 className="text-ink font-sans font-bold mb-4">Something went wrong</h2>
          <pre className="whitespace-pre-wrap text-sm">{String(this.state.error)}</pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-sans text-sm font-medium transition-colors"
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
  // isConfigured reads localStorage on each render; state only forces the
  // re-render after GistSetup finishes.
  const [configured, setConfigured] = useState(gist.isConfigured)

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
