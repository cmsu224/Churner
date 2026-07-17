import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import { getProgramMeta, pointsValue } from '../../utils/programs'
import { fmt$, fmtPts, fmtDate, daysUntil } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react'

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

function expiryInfo(entry) {
  if (!entry.expirationDate) return null
  const days = daysUntil(entry.expirationDate)
  if (days < 0) return { label: `Expired ${fmtDate(entry.expirationDate)}`, tone: 'text-danger-ink' }
  if (days <= 90) return { label: `Expires in ${days}d`, tone: 'text-warning-ink' }
  return { label: `Expires ${fmtDate(entry.expirationDate)}`, tone: 'text-ink-muted' }
}

export default function PointsItem({ entry, members }) {
  const { state, dispatch } = useChurn()
  const settings = state.settings ?? {}
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  // Quick single-field balance update — the everyday action, kept one tap away.
  const [quickValue, setQuickValue] = useState(null)

  const meta = getProgramMeta(entry.program)
  const expiry = expiryInfo(entry)
  const cents = Number(entry.valueCents) > 0 ? Number(entry.valueCents) : (settings.pointValueCents ?? 1)

  function startEdit() {
    setDraft({ ...entry })
    setQuickValue(null)
    setExpanded(true)
  }

  function cancelEdit() {
    setDraft(null)
    setExpanded(false)
  }

  function saveEdit() {
    if (!draft?.program?.trim()) return
    dispatch({
      type: 'UPDATE_POINTS_BALANCE', payload: {
        ...draft,
        program: draft.program.trim(),
        balance: parseFloat(draft.balance) || 0,
        valueCents: draft.valueCents !== '' && draft.valueCents != null ? parseFloat(draft.valueCents) || undefined : undefined,
        expirationDate: draft.expirationDate || null,
        // Re-stamp only when the number actually changed.
        updatedAt: (parseFloat(draft.balance) || 0) !== (Number(entry.balance) || 0) ? new Date().toISOString() : entry.updatedAt,
      }
    })
    cancelEdit()
  }

  function saveQuick() {
    const balance = parseFloat(quickValue)
    if (isNaN(balance) || balance < 0) return
    dispatch({ type: 'UPDATE_POINTS_BALANCE', payload: { ...entry, balance, updatedAt: new Date().toISOString() } })
    setQuickValue(null)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_POINTS_BALANCE', id: entry.id })
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="bg-surface border border-danger/30 rounded-xl p-4">
        <p className="text-sm text-ink-secondary mb-3">Delete <strong className="text-ink">{entry.program}</strong>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} className="flex-1 bg-danger hover:bg-danger/85 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div id={`item-${entry.id}`} className="bg-surface border border-edge rounded-xl overflow-hidden hover:border-edge-strong transition-colors">
      {/* Collapsed header — click toggles the full edit form */}
      <button className="w-full text-left p-4 pb-3" onClick={() => expanded ? cancelEdit() : startEdit()}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <IssuerLogo name={entry.program} meta={meta} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink text-sm">{entry.program}</span>
                <span className="text-ink-tertiary text-xs">{meta.type}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <PlayerBadge memberId={entry.memberId} members={members} />
                {expiry && <span className={`text-xs font-medium ${expiry.tone}`}>{expiry.label}</span>}
              </div>
            </div>
          </div>
          <span className="text-ink-tertiary flex-shrink-0">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
        </div>

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-ink tabular-nums">{fmtPts(entry.balance)} <span className="text-xs font-medium text-ink-tertiary">pts</span></span>
          <span className="text-xs text-ink-muted tabular-nums">≈ {fmt$(pointsValue(entry, settings))} <span className="text-ink-faint">@ {cents}¢/pt</span></span>
        </div>
        {entry.updatedAt && (
          <div className="mt-1 text-[11px] text-ink-faint">Updated {fmtDate(entry.updatedAt)}</div>
        )}
      </button>

      {/* Quick balance update — one tap, one field */}
      {!expanded && (
        <div className="px-4 pb-3">
          {quickValue == null ? (
            <button
              onClick={() => setQuickValue(String(entry.balance ?? 0))}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw size={11} />
              Update balance
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                autoFocus
                className={inp}
                value={quickValue}
                onChange={e => setQuickValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveQuick(); if (e.key === 'Escape') setQuickValue(null) }}
                placeholder="New balance"
              />
              <button onClick={() => setQuickValue(null)} className="bg-raised hover:bg-overlay text-ink-secondary px-3 rounded-lg text-xs transition-colors">Cancel</button>
              <button onClick={saveQuick} className="bg-accent hover:bg-accent-hover text-white font-semibold px-3 rounded-lg text-xs transition-colors">Save</button>
            </div>
          )}
        </div>
      )}

      {/* Expanded edit form */}
      {expanded && draft && (
        <div className="border-t border-edge-strong p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Person</label>
              <select className={inp} value={draft.memberId ?? ''} onChange={e => setDraft(d => ({ ...d, memberId: e.target.value }))}>
                {(members ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Balance (pts)</label>
              <input type="number" min="0" className={inp} value={draft.balance ?? ''} onChange={e => setDraft(d => ({ ...d, balance: e.target.value }))} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="text-xs text-accent-ink block mb-1 font-medium">Program <span className="text-accent-ink">*required</span></label>
            <input className={inpRequired} list="point-program-options" value={draft.program ?? ''} onChange={e => setDraft(d => ({ ...d, program: e.target.value }))} placeholder="e.g. Chase Ultimate Rewards" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Value (¢/pt)</label>
              <input type="number" min="0" step="0.1" className={inp} value={draft.valueCents ?? ''} onChange={e => setDraft(d => ({ ...d, valueCents: e.target.value }))} placeholder={`${settings.pointValueCents ?? 1} (default)`} />
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Expiration Date</label>
              <DateField value={draft.expirationDate} onChange={v => setDraft(d => ({ ...d, expirationDate: v }))} />
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Loyalty account #, transfer partners, redemption plans..." />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-ink-tertiary hover:text-danger-ink transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.program?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
