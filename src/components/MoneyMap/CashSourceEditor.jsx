import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { CASH_SOURCE_TYPES } from '../../engines/moneyFlow'
import { fmt$0 } from '../../utils/format'
import { inp } from '../shared/Field'
import { Home, Plus, Trash2, Check, X, ChevronDown, ChevronUp, Wallet } from 'lucide-react'

// Where money comes FROM: the brokerages and everyday banks that aren't
// themselves being churned. Kept deliberately thin — a name, a type, and an
// optional balance — because the interesting tracking happens on the accounts
// side. One source is the HUB: the account sweep-back reminders aim at.
//
// A balance left blank means "I don't track this here", and the app keeps it
// that way: pushes out of an untracked source don't invent a running total for
// it, and it stays out of the household cash figure rather than reading as $0.

export default function CashSourceEditor({ sources, perNode }) {
  const { dispatch } = useChurn()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', type: 'brokerage', balance: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  function numOrNull(v) {
    if (v === '' || v == null) return null
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  function saveNew() {
    if (!draft.name.trim()) return
    dispatch({
      type: 'ADD_CASH_SOURCE',
      payload: { name: draft.name.trim(), type: draft.type, isHub: false, balance: numOrNull(draft.balance), notes: '' },
    })
    setDraft({ name: '', type: 'brokerage', balance: '' })
    setAdding(false)
  }

  function saveEdit() {
    if (!editing?.name?.trim()) return
    dispatch({ type: 'UPDATE_CASH_SOURCE', payload: { ...editing, name: editing.name.trim(), balance: numOrNull(editing.balance) } })
    setEditing(null)
  }

  return (
    <div className="bg-surface border border-edge rounded-xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-raised/50 transition-colors"
      >
        <Wallet size={14} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-semibold text-ink">Cash sources</span>
        <span className="text-xs text-ink-tertiary">{sources.length}</span>
        <span className="ml-auto text-ink-faint">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>

      {open && (
        <div className="border-t border-edge">
          <div className="divide-y divide-edge">
            {sources.map(s => {
              const flow = perNode.get(s.key)
              const isEditing = editing?.id === s.id
              return (
                <div key={s.key} className="px-4 py-2.5">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inp} value={editing.name} onChange={e => setEditing(d => ({ ...d, name: e.target.value }))} placeholder="Fidelity" autoFocus />
                        <select className={inp} value={editing.type ?? 'brokerage'} onChange={e => setEditing(d => ({ ...d, type: e.target.value }))}>
                          {CASH_SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          className={inp}
                          value={editing.balance ?? ''}
                          onChange={e => setEditing(d => ({ ...d, balance: e.target.value }))}
                          placeholder="Balance (leave blank if untracked)"
                        />
                        <div className="flex items-center gap-1.5">
                          <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                            <Check size={12} />Save
                          </button>
                          <button onClick={() => setEditing(null)} aria-label="Cancel" className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditing({ ...s.source })} className="flex-1 min-w-0 text-left">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-ink truncate">{s.name}</span>
                          {s.isHub && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-accent-ink bg-accent/10 rounded px-1 py-px flex-shrink-0">Hub</span>
                          )}
                        </span>
                        <span className="block text-[11px] text-ink-tertiary">
                          {s.sublabel}
                          {s.balance == null
                            ? ' · balance not tracked'
                            : ` · ${fmt$0(s.balance)}`}
                          {flow?.inflightOut > 0 && ` · ${fmt$0(flow.inflightOut)} in flight out`}
                        </span>
                      </button>
                      {!s.isHub && (
                        <button
                          onClick={() => dispatch({ type: 'SET_HUB_SOURCE', id: s.id })}
                          title="Make this the main account money comes home to"
                          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-raised border border-edge-strong text-ink-muted hover:text-ink transition-colors flex-shrink-0"
                        >
                          <Home size={11} />Set as hub
                        </button>
                      )}
                      {confirmDelete === s.id ? (
                        <button
                          onClick={() => { dispatch({ type: 'DELETE_CASH_SOURCE', id: s.id }); setConfirmDelete(null) }}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md bg-danger/15 text-danger-ink border border-danger/30 flex-shrink-0"
                        >
                          Delete?
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          onBlur={() => setConfirmDelete(null)}
                          aria-label={`Delete ${s.name}`}
                          className="p-1 rounded text-ink-faint hover:text-danger-ink transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {adding ? (
            <div className="px-4 py-3 border-t border-edge bg-raised/40 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inp}
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNew() } }}
                  placeholder="e.g. Fidelity, Schwab"
                  autoFocus
                />
                <select className={inp} value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
                  {CASH_SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={inp}
                  value={draft.balance}
                  onChange={e => setDraft(d => ({ ...d, balance: e.target.value }))}
                  placeholder="Balance (optional)"
                />
                <button onClick={saveNew} disabled={!draft.name.trim()} className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
                  Add source
                </button>
                <button onClick={() => setAdding(false)} aria-label="Cancel" className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-1.5 px-4 py-2.5 border-t border-edge text-xs font-medium text-accent-ink hover:bg-raised/50 transition-colors"
            >
              <Plus size={13} />Add a cash source
            </button>
          )}
        </div>
      )}
    </div>
  )
}
