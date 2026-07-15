import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Users, Link2, ArrowDownUp, CheckCircle, AlertCircle } from 'lucide-react'

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

export default function SettingsView() {
  const { gist } = useChurn()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [pat, setPat] = useState('')
  const [gistId, setGistId] = useState(gist.getGistId())
  const [saveStatus, setSaveStatus] = useState(null)

  function currentPat() {
    return localStorage.getItem('churner_pat') ?? ''
  }

  function saveSync() {
    const token = pat.trim() || currentPat()
    const id = gistId.trim()
    if (!token || !id) return
    gist.configure(token, id)
    setSaveStatus('saved')
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-ink">Settings</h1>

      {/* Appearance */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ink font-medium">Theme</div>
            <div className="text-xs text-ink-tertiary mt-0.5">Currently {theme === 'dark' ? 'dark' : 'light'} mode</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-raised hover:bg-overlay border border-edge-strong text-ink-secondary hover:text-ink text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
        </div>
      </section>

      {/* GitHub Sync */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">GitHub Sync</h2>
        <p className="text-xs text-ink-tertiary mb-4">Update your Gist ID or Personal Access Token. Changes take effect on reload.</p>

        {gist.error && (
          <div className="flex items-center gap-2 text-xs text-danger-ink bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={13} />
            {gist.error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-muted block mb-1 font-medium">Gist ID</label>
            <input
              className={inp}
              value={gistId}
              onChange={e => setGistId(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6..."
            />
            <p className="text-[11px] text-ink-faint mt-1">
              Found in your Gist URL: <span className="text-ink-tertiary">gist.github.com/username/<strong>this-part</strong></span>
            </p>
          </div>
          <div>
            <label className="text-xs text-ink-muted block mb-1 font-medium">Personal Access Token</label>
            <input
              type="password"
              className={inp}
              value={pat}
              onChange={e => setPat(e.target.value)}
              placeholder="Leave blank to keep existing token"
              autoComplete="new-password"
            />
            <p className="text-[11px] text-ink-faint mt-1">Leave blank to keep your current token. Needs <code className="text-ink-tertiary">gist</code> scope only.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSync}
              disabled={!gistId.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-ink text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Save &amp; Reload
            </button>
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-success-ink">
                <CheckCircle size={13} /> Saved — reloading…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Manage sections */}
      <section>
        <h2 className="text-sm font-semibold text-ink-muted mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/members',   icon: Users,       label: 'Members',        desc: 'Add and manage churning members' },
            { to: '/resources', icon: Link2,        label: 'Resources',      desc: 'Guides, referral links, and tools' },
            { to: '/import',    icon: ArrowDownUp,  label: 'Import / Export', desc: 'Backup and restore your data' },
          ].map(({ to, icon: Icon, label, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="text-left bg-surface hover:bg-raised border border-edge hover:border-edge-strong rounded-xl p-4 transition-colors"
            >
              <Icon size={20} className="text-ink-muted mb-2" />
              <div className="text-sm font-semibold text-ink">{label}</div>
              <div className="text-xs text-ink-tertiary mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Danger Zone</h2>
        <p className="text-xs text-ink-tertiary mb-4">Disconnect from GitHub and clear all stored credentials. Your Gist data is not deleted.</p>
        <button
          onClick={() => { gist.disconnect(); window.location.reload() }}
          className="bg-danger/20 hover:bg-danger/30 text-danger-ink hover:text-danger-ink border border-danger/30 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </section>
    </div>
  )
}
