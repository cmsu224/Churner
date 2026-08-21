import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { fmtDate, todayISODate } from '../../utils/format'
import DateField from '../shared/DateField'
import { inp } from '../shared/Field'
import { Bell, Check, Plus, Trash2, X, AlertTriangle, PiggyBank, Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

// The "come back to this" board. Reminders you set when you logged a push sit
// here next to the ones the app works out for itself — a transfer that never
// landed, cash left in an account that no longer needs it. Both read the same,
// but only the ones you set can be ticked off: a derived one disappears when
// the fact behind it changes.

const STATE_META = {
  overdue: { cls: 'border-danger/40 bg-danger/5', text: 'text-danger-ink', icon: AlertTriangle },
  today: { cls: 'border-warning/40 bg-warning/5', text: 'text-warning-ink', icon: Bell },
  upcoming: { cls: 'border-edge bg-surface', text: 'text-ink-tertiary', icon: Clock },
  idle: { cls: 'border-success/40 bg-success/5', text: 'text-success-ink', icon: PiggyBank },
  undated: { cls: 'border-edge bg-surface', text: 'text-ink-tertiary', icon: Bell },
}

const QUICK_DATES = [
  { days: 3, label: '3d' },
  { days: 7, label: '1w' },
  { days: 14, label: '2w' },
  { days: 21, label: '3w' },
]

function addDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function whenLabel(r) {
  if (r.state === 'overdue') return `${Math.abs(r.days)}d overdue`
  if (r.state === 'today') return 'Due today'
  if (r.state === 'upcoming') return `In ${r.days}d · ${fmtDate(r.dueDate)}`
  if (r.state === 'idle') return r.days != null ? `Sitting ${r.days}d` : 'Idle cash'
  return 'No date set'
}

export default function ReminderBoard({ reminders, done = [] }) {
  const { dispatch } = useChurn()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [draft, setDraft] = useState({ title: '', dueDate: addDays(21) })

  function saveDraft() {
    if (!draft.title.trim()) return
    dispatch({
      type: 'ADD_REMINDER',
      payload: { kind: 'custom', title: draft.title.trim(), notes: '', dueDate: draft.dueDate || todayISODate(), accountId: null, transferId: null, doneDate: null },
    })
    setDraft({ title: '', dueDate: addDays(21) })
    setAdding(false)
  }

  return (
    <div className="bg-surface border border-edge rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-edge">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <Bell size={14} className="text-ink-muted" aria-hidden="true" />
          Check back on
          {reminders.length > 0 && <span className="text-xs font-normal text-ink-tertiary tabular-nums">{reminders.length}</span>}
        </h2>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 text-[11px] font-medium text-ink-muted hover:text-ink transition-colors"
        >
          {adding ? <X size={12} /> : <Plus size={12} />}
          {adding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {adding && (
        <div className="px-4 py-3 border-b border-edge bg-raised/40 space-y-2">
          <input
            className={inp}
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveDraft() } }}
            placeholder="e.g. Check if the Citi bonus posted"
            autoFocus
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {QUICK_DATES.map(q => (
              <button
                key={q.days}
                type="button"
                onClick={() => setDraft(d => ({ ...d, dueDate: addDays(q.days) }))}
                className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${
                  draft.dueDate === addDays(q.days)
                    ? 'bg-accent/15 text-accent-ink border-accent/40'
                    : 'bg-raised text-ink-muted border-edge-strong hover:text-ink'
                }`}
              >
                {q.label}
              </button>
            ))}
            <span className="w-32"><DateField value={draft.dueDate} onChange={v => setDraft(d => ({ ...d, dueDate: v }))} /></span>
            <button
              onClick={saveDraft}
              disabled={!draft.title.trim()}
              className="ml-auto bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Add reminder
            </button>
          </div>
        </div>
      )}

      {reminders.length === 0 && done.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Check size={18} className="text-success-ink mx-auto mb-2" aria-hidden="true" />
          <div className="text-sm text-ink-muted">Nothing to check on</div>
          <div className="text-[11px] text-ink-tertiary mt-1">
            Add <code className="text-ink-muted">+3w</code> when you log a push and the check-back lands here.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-edge max-h-[340px] overflow-y-auto">
          {reminders.map(r => {
            const meta = STATE_META[r.state] ?? STATE_META.undated
            const Icon = meta.icon
            return (
              <div key={r.id} className={`flex items-start gap-2.5 px-4 py-2.5 border-l-2 ${meta.cls}`}>
                <Icon size={13} className={`${meta.text} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => r.accountId && navigate(`/accounts?highlight=${r.accountId}`)}
                  disabled={!r.accountId}
                >
                  <div className="text-xs font-medium text-ink leading-snug">{r.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-[11px] font-medium ${meta.text}`}>{whenLabel(r)}</span>
                    {r.derived && (
                      <span className="text-[10px] text-ink-faint border border-edge rounded px-1">auto</span>
                    )}
                  </div>
                  {r.detail && <div className="text-[11px] text-ink-tertiary mt-1 leading-snug">{r.detail}</div>}
                </button>
                {/* Derived rows have nothing to tick — they clear themselves
                    when the transfer lands or the money comes home. */}
                {!r.derived && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => dispatch({ type: 'COMPLETE_REMINDER', id: r.reminderId })}
                      aria-label={`Mark done: ${r.title}`}
                      title="Mark done"
                      className="p-1 rounded text-ink-faint hover:text-success-ink transition-colors"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_REMINDER', id: r.reminderId })}
                      aria-label={`Delete: ${r.title}`}
                      title="Delete"
                      className="p-1 rounded text-ink-faint hover:text-danger-ink transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ticked by mistake, or a transfer marked landed that closed its own
          check-back — the same restore drawer the notification centre uses. */}
      {done.length > 0 && (
        <div className="border-t border-edge">
          <button
            onClick={() => setShowDone(d => !d)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] text-ink-faint hover:text-ink-muted transition-colors"
          >
            {showDone ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Done ({done.length})
          </button>
          {showDone && (
            <div className="divide-y divide-edge">
              {done.map(r => (
                <div key={r.id} className="flex items-center gap-2 px-4 py-2 opacity-60">
                  <Check size={12} className="text-success-ink flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 text-xs text-ink-muted line-through truncate">{r.title}</span>
                  <button
                    onClick={() => dispatch({ type: 'REOPEN_REMINDER', id: r.id })}
                    aria-label={`Restore: ${r.title}`}
                    title="Restore"
                    className="p-1 rounded text-ink-faint hover:text-ink transition-colors flex-shrink-0"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_REMINDER', id: r.id })}
                    aria-label={`Delete: ${r.title}`}
                    title="Delete"
                    className="p-1 rounded text-ink-faint hover:text-danger-ink transition-colors flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
