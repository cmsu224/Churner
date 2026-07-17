import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useTheme } from '../../hooks/useTheme'
import { POINT_PROGRAMS } from '../../utils/programs'
import { Sun, Moon, Users, Link2, ArrowDownUp, CheckCircle, AlertCircle, Bell, BellOff } from 'lucide-react'

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

export default function SettingsView() {
  const { gist, state, dispatch } = useChurn()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [pat, setPat] = useState('')
  const [gistId, setGistId] = useState(gist.getGistId())
  const [saveStatus, setSaveStatus] = useState(null)

  const notifyEnabled = !!state.settings?.notifyEnabled
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState(notifSupported ? Notification.permission : 'unsupported')
  const pointValueCents = state.settings?.pointValueCents ?? 1
  const programValueCents = state.settings?.programValueCents ?? {}
  // Raw input text per program while editing, so partial entries like "0."
  // don't get clobbered by the parsed store value mid-keystroke.
  const [valDrafts, setValDrafts] = useState({})

  function setProgramValue(key, raw) {
    setValDrafts(d => ({ ...d, [key]: raw }))
    const map = { ...programValueCents }
    const v = parseFloat(raw)
    if (raw.trim() === '') delete map[key]
    else if (!Number.isNaN(v) && v > 0) map[key] = v
    else return // incomplete/invalid — keep the draft, don't touch the store
    dispatch({ type: 'SET_SETTING', key: 'programValueCents', value: map })
  }

  async function toggleNotifications() {
    if (notifyEnabled) {
      dispatch({ type: 'SET_SETTING', key: 'notifyEnabled', value: false })
      return
    }
    if (!notifSupported) return
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      dispatch({ type: 'SET_SETTING', key: 'notifyEnabled', value: true })
      try {
        new Notification('Churner', { body: 'Notifications are on — you’ll hear about newly critical items while the app is open.' })
      } catch { /* ignore */ }
    }
  }

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

      {/* Notifications */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Notifications</h2>
        <p className="text-xs text-ink-tertiary mb-4">
          While the app is open, get a browser notification the moment an action item turns critical.
          For reminders when the app is <em>closed</em>, use <Link to="/timeline" className="text-accent-ink hover:underline">Export .ics on the Timeline page</Link> and
          subscribe in Google/Apple Calendar — that's the reliable channel for a static app like this one.
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-ink font-medium">Browser notifications</div>
            <div className="text-xs text-ink-tertiary mt-0.5">
              {!notifSupported
                ? 'Not supported by this browser.'
                : permission === 'denied'
                ? 'Blocked by the browser — allow notifications for this site in your browser settings, then try again.'
                : notifyEnabled
                ? 'On — fires for newly critical items while the app is open.'
                : 'Off. This device will ask for permission when you enable it.'}
            </div>
          </div>
          <button
            onClick={toggleNotifications}
            disabled={!notifSupported || permission === 'denied'}
            className="flex items-center gap-2 bg-raised hover:bg-overlay border border-edge-strong text-ink-secondary hover:text-ink disabled:opacity-40 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            {notifyEnabled ? <BellOff size={15} /> : <Bell size={15} />}
            {notifyEnabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      </section>

      {/* Earnings valuation */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Earnings Valuation</h2>
        <p className="text-xs text-ink-tertiary mb-4">
          The Earnings page values points/miles bonuses at this rate unless a card has its own cash value set. Cash bonuses always count at face value.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink font-medium" htmlFor="point-value">Point value</label>
          <input
            id="point-value"
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            value={pointValueCents}
            onChange={e => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v) && v > 0) dispatch({ type: 'SET_SETTING', key: 'pointValueCents', value: v })
            }}
            className={`${inp} w-24`}
          />
          <span className="text-sm text-ink-muted">¢ per point</span>
        </div>
      </section>

      {/* Per-program point valuations (Points page) */}
      <section className="bg-surface border border-edge rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ink mb-1">Point Valuations</h2>
        <p className="text-xs text-ink-tertiary mb-4">
          What one point of each program is worth on the <span className="text-ink-secondary">Points</span> page.
          Defaults come from published valuations (The Points Guy, July 2026 where available) — type a value to override,
          clear it to go back to the default. A balance&rsquo;s own ¢/pt override always wins, and programs not
          listed here use the Earnings rate above.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {POINT_PROGRAMS.map(p => {
            const key = p.name.toLowerCase()
            const custom = programValueCents[key]
            return (
              <div key={p.name} className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-secondary truncate" title={p.name}>{p.name}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    aria-label={`${p.name} value in cents per point`}
                    value={valDrafts[key] ?? (custom != null ? String(custom) : '')}
                    onChange={e => setProgramValue(key, e.target.value)}
                    placeholder={String(p.valueCents)}
                    className="w-20 bg-raised border border-edge-strong rounded-lg px-2 py-1.5 text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors text-right"
                  />
                  <span className="text-[11px] text-ink-faint w-7">¢/pt</span>
                </span>
              </div>
            )
          })}
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
              className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
