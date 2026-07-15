import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Info, X, Clock, RotateCcw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { useActionItems, useBrowserNotifications } from '../../hooks/useActionItems'
import { fmtDate } from '../../utils/format'

const TYPE_META = {
  critical: { icon: AlertTriangle, cls: 'text-danger-ink' },
  warning: { icon: AlertTriangle, cls: 'text-warning-ink' },
  info: { icon: Info, cls: 'text-accent-ink' },
}

function targetRoute(item) {
  if (item.cardId) return `/cards?highlight=${item.cardId}`
  if (item.accountId) return `/accounts?highlight=${item.accountId}`
  return null
}

function NotificationRow({ item, onNavigate, actions }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.info
  const Icon = meta.icon
  const route = targetRoute(item)
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-raised/60 transition-colors group">
      <Icon size={14} className={`${meta.cls} flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => route && onNavigate(route)}
        disabled={!route}
      >
        <div className="text-xs font-medium text-ink leading-snug">{item.title}</div>
        <div className="text-[11px] text-ink-tertiary mt-0.5">
          {item.dueDate ? `Due ${fmtDate(item.dueDate)}` : item.action}
        </div>
      </button>
      <div className="flex items-center gap-0.5 flex-shrink-0">{actions}</div>
    </div>
  )
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const {
    active, snoozedItems, dismissedItems, unread,
    dismiss, restore, snooze, snoozeUntil, markAllSeen,
  } = useActionItems()
  const [open, setOpen] = useState(false)
  const [snoozeFor, setSnoozeFor] = useState(null) // item id showing snooze options
  const [showMuted, setShowMuted] = useState(false)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)

  // Fire browser notifications for newly critical items while the app is open
  useBrowserNotifications(active)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    setOpen(o => {
      const next = !o
      if (next) markAllSeen()
      return next
    })
  }

  function go(route) {
    setOpen(false)
    navigate(route)
  }

  const muted = [...snoozedItems, ...dismissedItems]

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors"
      >
        <Bell size={16} />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-surface border border-edge-strong rounded-xl shadow-pop z-50 animate-scale-in overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-edge">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            <span className="text-[11px] text-ink-tertiary">synced to all devices</span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-edge">
            {active.length === 0 && (
              <div className="px-4 py-8 text-center">
                <CheckCircle size={20} className="text-success-ink mx-auto mb-2" aria-hidden="true" />
                <div className="text-sm text-ink-muted">All caught up</div>
                <div className="text-[11px] text-ink-tertiary mt-1">
                  Upcoming and overdue action items appear here.
                </div>
              </div>
            )}

            {active.map(item => (
              <div key={item.id}>
                <NotificationRow
                  item={item}
                  onNavigate={go}
                  actions={
                    <>
                      <button
                        onClick={() => setSnoozeFor(s => (s === item.id ? null : item.id))}
                        aria-label={`Snooze: ${item.title}`}
                        title="Snooze"
                        className="p-1 rounded text-ink-faint hover:text-warning-ink transition-colors"
                      >
                        <Clock size={13} />
                      </button>
                      <button
                        onClick={() => dismiss(item.id)}
                        aria-label={`Dismiss: ${item.title}`}
                        title="Dismiss"
                        className="p-1 rounded text-ink-faint hover:text-danger-ink transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </>
                  }
                />
                {snoozeFor === item.id && (
                  <div className="flex items-center gap-1.5 px-9 pb-2.5 -mt-1">
                    <span className="text-[11px] text-ink-tertiary">Snooze for</span>
                    {[1, 3, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => { snooze(item.id, d); setSnoozeFor(null) }}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-raised hover:bg-overlay text-ink-secondary transition-colors"
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {muted.length > 0 && (
              <div>
                <button
                  onClick={() => setShowMuted(s => !s)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-[11px] text-ink-faint hover:text-ink-muted transition-colors"
                >
                  {showMuted ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Snoozed & dismissed ({muted.length})
                </button>
                {showMuted && muted.map(item => (
                  <div key={item.id} className="opacity-60">
                    <NotificationRow
                      item={item}
                      onNavigate={go}
                      actions={
                        <button
                          onClick={() => restore(item.id)}
                          aria-label={`Restore: ${item.title}`}
                          title={snoozeUntil(item.id) ? `Snoozed until ${fmtDate(snoozeUntil(item.id))}` : 'Restore'}
                          className="p-1 rounded text-ink-faint hover:text-ink transition-colors"
                        >
                          <RotateCcw size={13} />
                        </button>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
