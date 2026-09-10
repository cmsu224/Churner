import { useState } from 'react'
import { useGist } from '../../hooks/useGist'
import { INITIAL_STATE } from '../../data/initialState'
import { KeyRound, Link2, Plus, Database } from 'lucide-react'

export default function GistSetup({ onConfigured }) {
  const gist = useGist()
  const [pat, setPat] = useState('')
  const [gistId, setGistId] = useState('')
  const [repo, setRepo] = useState('cmsu224/Churning-database')
  const [mode, setMode] = useState('repo')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleConnect() {
    setErr('')
    if (!pat.trim()) { setErr('GitHub PAT is required'); return }
    setLoading(true)
    try {
      if (mode === 'repo') {
        if (!repo.trim().includes('/')) throw new Error('Repository must use owner/name format')
        const res = await fetch(`https://api.github.com/repos/${repo.trim()}/contents/churner-data.json?ref=main`, {
          headers: {
            Authorization: `Bearer ${pat.trim()}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        if (!res.ok) throw new Error(`Cannot access repository data (${res.status})`)
        gist.configureRepository(pat.trim(), repo.trim(), 'main', 'churner-data.json')
        onConfigured()
      } else if (mode === 'new') {
        const newId = await gist.createNewGist(pat.trim())
        await fetch(`https://api.github.com/gists/${newId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${pat.trim()}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({
            files: { 'churner-data.json': { content: JSON.stringify(INITIAL_STATE, null, 2) } },
          }),
        })
        gist.configure(pat.trim(), newId)
        onConfigured()
      } else {
        if (!gistId.trim()) { setErr('Gist ID is required'); setLoading(false); return }
        const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
          headers: {
            Authorization: `Bearer ${pat.trim()}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        if (!res.ok) throw new Error(`Invalid Gist ID or token (${res.status})`)
        gist.configure(pat.trim(), gistId.trim())
        onConfigured()
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-ink mb-1">Churner</div>
          <div className="text-ink-muted text-sm">Four-Member Bonus Tracker</div>
        </div>

        <div className="bg-surface border border-edge-strong rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-ink mb-1">Connect Your Data</h2>
          <p className="text-ink-muted text-sm mb-6">
            Your data lives in private GitHub storage that only authorized tools can access.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                <KeyRound size={13} className="inline mr-1.5 opacity-70" />
                GitHub Personal Access Token
              </label>
              <input
                type="password"
                value={pat}
                onChange={e => setPat(e.target.value)}
                placeholder="github_pat_..."
                className="w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-ink-tertiary text-xs mt-1">
                Repository mode needs read/write Contents access to that repository. Stored in your browser only.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('repo')}
                className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${mode === 'repo' ? 'bg-accent border-accent text-white' : 'bg-raised border-edge-strong text-ink-muted'}`}
              >
                <Database size={13} className="inline mr-1" />Private Repo
              </button>
              <button
                onClick={() => setMode('existing')}
                className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${mode === 'existing' ? 'bg-accent border-accent text-white' : 'bg-raised border-edge-strong text-ink-muted'}`}
              >
                <Link2 size={13} className="inline mr-1" />Use Gist
              </button>
              <button
                onClick={() => setMode('new')}
                className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${mode === 'new' ? 'bg-accent border-accent text-white' : 'bg-raised border-edge-strong text-ink-muted'}`}
              >
                <Plus size={13} className="inline mr-1" />New Gist
              </button>
            </div>

            {mode === 'repo' && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Private repository</label>
                <input
                  type="text"
                  value={repo}
                  onChange={e => setRepo(e.target.value)}
                  placeholder="owner/repository"
                  className="w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-ink-tertiary text-xs mt-1">Reads <code className="text-ink-secondary">main/churner-data.json</code>.</p>
              </div>
            )}

            {mode === 'existing' && (
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-1.5">Gist ID</label>
                <input
                  type="text"
                  value={gistId}
                  onChange={e => setGistId(e.target.value)}
                  placeholder="e.g. a1b2c3d4e5f6..."
                  className="w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}

            {mode === 'new' && (
              <div className="bg-raised rounded-lg p-3 text-ink-muted text-xs">
                A private Gist named <code className="text-ink-secondary">churner-data.json</code> will be created with initial data.
              </div>
            )}

            {err && (
              <p className="text-danger-ink text-sm bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{err}</p>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Connecting...' : mode === 'new' ? 'Create & Connect' : mode === 'repo' ? 'Connect Repository' : 'Connect Gist'}
            </button>
          </div>
        </div>

        <p className="text-center text-ink-faint text-xs mt-4">
          Your PAT is never sent anywhere except GitHub&apos;s API.
        </p>
      </div>
    </div>
  )
}
