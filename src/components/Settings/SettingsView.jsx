import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon, Users, Link2, ArrowDownUp, CheckCircle, AlertCircle } from 'lucide-react'

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

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
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Appearance */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white font-medium">Theme</div>
            <div className="text-xs text-zinc-500 mt-0.5">Currently {theme === 'dark' ? 'dark' : 'light'} mode</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
        </div>
      </section>

      {/* GitHub Sync */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">GitHub Sync</h2>
        <p className="text-xs text-zinc-500 mb-4">Update your Gist ID or Personal Access Token. Changes take effect on reload.</p>

        {gist.error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle size={13} />
            {gist.error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-medium">Gist ID</label>
            <input
              className={inp}
              value={gistId}
              onChange={e => setGistId(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6..."
            />
            <p className="text-[11px] text-zinc-600 mt-1">
              Found in your Gist URL: <span className="text-zinc-500">gist.github.com/username/<strong>this-part</strong></span>
            </p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-medium">Personal Access Token</label>
            <input
              type="password"
              className={inp}
              value={pat}
              onChange={e => setPat(e.target.value)}
              placeholder="Leave blank to keep existing token"
              autoComplete="new-password"
            />
            <p className="text-[11px] text-zinc-600 mt-1">Leave blank to keep your current token. Needs <code className="text-zinc-500">gist</code> scope only.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSync}
              disabled={!gistId.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Save &amp; Reload
            </button>
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle size={13} /> Saved — reloading…
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Manage sections */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-400 mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/members',   icon: Users,       label: 'Members',        desc: 'Add and manage churning members' },
            { to: '/resources', icon: Link2,        label: 'Resources',      desc: 'Guides, referral links, and tools' },
            { to: '/import',    icon: ArrowDownUp,  label: 'Import / Export', desc: 'Backup and restore your data' },
          ].map(({ to, icon: Icon, label, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors"
            >
              <Icon size={20} className="text-zinc-400 mb-2" />
              <div className="text-sm font-semibold text-white">{label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Danger Zone</h2>
        <p className="text-xs text-zinc-500 mb-4">Disconnect from GitHub and clear all stored credentials. Your Gist data is not deleted.</p>
        <button
          onClick={() => { gist.disconnect(); window.location.reload() }}
          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </section>
    </div>
  )
}
