import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountNextStatus } from '../../engines/lifecycle'
import { fmt$, fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Shield } from 'lucide-react'

const STATUSES = ['Opened', 'DD Linked', 'Bonus Pending', 'Bonus Received', 'Cooling Period', 'Safe to Close']
const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

export default function AccountItem({ account, players }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const shield = getClawbackStatus(account)
  const nextStatus = getAccountNextStatus(account)

  function startEdit() {
    setDraft({ ...account })
    setExpanded(true)
  }

  function cancelEdit() {
    setDraft(null)
    setExpanded(false)
  }

  function saveEdit() {
    if (!draft?.bankName?.trim()) return
    const openedDate = draft.openedDate || null
    const safeToCloseDate = openedDate
      ? (() => { const d = new Date(openedDate); d.setDate(d.getDate() + 181); return d.toISOString() })()
      : null
    dispatch({
      type: 'UPDATE_ACCOUNT', payload: {
        ...draft,
        requiredDD: draft.requiredDD !== '' && draft.requiredDD != null ? parseFloat(draft.requiredDD) : undefined,
        bonusAmount: draft.bonusAmount !== '' && draft.bonusAmount != null ? parseFloat(draft.bonusAmount) : undefined,
        last4: draft.last4 ? String(draft.last4).slice(-4) : undefined,
        openedDate,
        ddLinkedDate: draft.ddLinkedDate || null,
        bonusReceivedDate: draft.bonusReceivedDate || null,
        safeToCloseDate,
      }
    })
    setDraft(null)
    setExpanded(false)
  }

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function handleDelete() {
    dispatch({ type: 'DELETE_ACCOUNT', id: account.id })
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4">
        <p className="text-sm text-zinc-300 mb-3">Delete <strong className="text-white">{account.bankName}</strong>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
      {/* Collapsed header */}
      <button
        className="w-full text-left p-4"
        onClick={() => expanded ? cancelEdit() : startEdit()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{account.bankName}</span>
              {account.last4 && <span className="text-zinc-500 text-xs">···{account.last4}</span>}
              {account.accountType && <span className="text-zinc-500 text-xs">{account.accountType}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <PlayerBadge playerId={account.playerId} players={players} />
              <StatusBadge status={account.status} />
              {account.isTaxable && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  1099-INT
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-zinc-500">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-xs text-zinc-400">
          {account.bonusAmount != null && (
            <div className="flex justify-between">
              <span>Bonus</span>
              <span className="text-white font-medium">{fmt$(account.bonusAmount)}</span>
            </div>
          )}
          {account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Received</span>
              <span className="text-emerald-400">{fmtDate(account.bonusReceivedDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 pt-1 border-t border-zinc-800">
            <Shield size={11} className={shield.safe ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={shield.safe ? 'text-emerald-400' : 'text-amber-400'}>{shield.message}</span>
          </div>
        </div>

        {nextStatus && !expanded && (
          <div className="mt-1.5 text-xs text-amber-400">→ Suggest: {nextStatus}</div>
        )}
      </button>

      {/* Expanded edit form */}
      {expanded && draft && (
        <div className="border-t border-zinc-700 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Player</label>
              <select className={inp} value={draft.playerId ?? ''} onChange={e => set('playerId', e.target.value)}>
                {(players ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Status</label>
              <select className={inp} value={draft.status ?? 'Opened'} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Bank Name <span className="text-red-400">*</span></label>
            <input className={inp} value={draft.bankName ?? ''} onChange={e => set('bankName', e.target.value)} placeholder="e.g. Chase, Wells Fargo" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Account Type</label>
              <select className={inp} value={draft.accountType ?? 'Checking'} onChange={e => set('accountType', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Last 4</label>
              <input className={inp} value={draft.last4 ?? ''} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Opened Date</label>
            <input type="date" className={inp} value={draft.openedDate?.slice(0, 10) ?? ''} onChange={e => set('openedDate', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Amount ($)</label>
              <input type="number" min="0" className={inp} value={draft.bonusAmount ?? ''} onChange={e => set('bonusAmount', e.target.value)} placeholder="300" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Received Date</label>
              <input type="date" className={inp} value={draft.bonusReceivedDate?.slice(0, 10) ?? ''} onChange={e => set('bonusReceivedDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Required DD ($/month)</label>
            <input type="number" min="0" className={inp} value={draft.requiredDD ?? ''} onChange={e => set('requiredDD', e.target.value)} placeholder="500 (optional)" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">DD Source</label>
            <input className={inp} value={draft.ddSourceDescription ?? ''} onChange={e => set('ddSourceDescription', e.target.value)} placeholder="e.g. Payroll, SSI, ACH transfer" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">DD Linked Date</label>
            <input type="date" className={inp} value={draft.ddLinkedDate?.slice(0, 10) ?? ''} onChange={e => set('ddLinkedDate', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={!!draft.isTaxable} onChange={e => set('isTaxable', e.target.checked)} />
            Bank bonus is taxable (1099-INT)
          </label>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="optional" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.bankName?.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
