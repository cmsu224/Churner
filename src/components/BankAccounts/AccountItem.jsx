import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountNextStatus } from '../../engines/lifecycle'
import { fmt$, fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Shield, ExternalLink } from 'lucide-react'

const STATUSES = ['Opened', 'DD Linked', 'Bonus Pending', 'Bonus Received', 'Cooling Period', 'Safe to Close']
const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

function ddDeadlineInfo(account) {
  if (!account.openedDate || account.ddLinkedDate) return null
  if (!(account.ddDeadlineDays > 0) && !(account.requiredDD > 0)) return null
  const days = account.ddDeadlineDays ?? 90
  const deadline = new Date(account.openedDate)
  deadline.setDate(deadline.getDate() + days)
  const daysLeft = Math.ceil((deadline - new Date()) / 86400000)
  return { daysLeft, deadline: deadline.toISOString(), overdue: daysLeft < 0 }
}

function numOpt(v) {
  if (v === '' || v == null) return undefined
  const n = parseFloat(v)
  return isNaN(n) ? undefined : n
}

function intOpt(v) {
  if (v === '' || v == null) return undefined
  const n = parseInt(v)
  return isNaN(n) ? undefined : n
}

export default function AccountItem({ account, players }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const shield = getClawbackStatus(account)
  const nextStatus = getAccountNextStatus(account)
  const ddInfo = ddDeadlineInfo(account)

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
        requiredDD: numOpt(draft.requiredDD),
        bonusAmount: numOpt(draft.bonusAmount),
        minimumBalance: numOpt(draft.minimumBalance),
        ddDeadlineDays: intOpt(draft.ddDeadlineDays),
        requiredDDCount: intOpt(draft.requiredDDCount),
        ddsMade: intOpt(draft.ddsMade),
        bonusDeadlineDays: intOpt(draft.bonusDeadlineDays),
        last4: draft.last4 ? String(draft.last4).slice(-4) : undefined,
        openedDate,
        ddLinkedDate: draft.ddLinkedDate || null,
        bonusReceivedDate: draft.bonusReceivedDate || null,
        offerUrl: draft.offerUrl || null,
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
              {account.offerUrl && (
                <a
                  href={account.offerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-xs text-blue-400 hover:text-blue-300"
                >
                  Offer <ExternalLink size={9} />
                </a>
              )}
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
          <span className="text-zinc-500 flex-shrink-0">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
        </div>

        <div className="mt-2 space-y-1 text-xs text-zinc-400">
          {account.bonusAmount != null && (
            <div className="flex justify-between">
              <span>Bonus</span>
              <span className="text-white font-medium">{fmt$(account.bonusAmount)}</span>
            </div>
          )}
          {/* DD deadline progress */}
          {ddInfo && (
            <div className={`flex justify-between font-medium ${ddInfo.overdue ? 'text-red-400' : ddInfo.daysLeft <= 14 ? 'text-amber-400' : 'text-zinc-400'}`}>
              <span>DD deadline</span>
              <span>{ddInfo.overdue ? `OVERDUE ${Math.abs(ddInfo.daysLeft)}d ago` : `${ddInfo.daysLeft}d left`}</span>
            </div>
          )}
          {/* Multiple DD progress */}
          {(account.requiredDDCount ?? 1) > 1 && (
            <div className="flex justify-between">
              <span>Direct deposits</span>
              <span className={(account.ddsMade ?? 0) >= account.requiredDDCount ? 'text-emerald-400' : 'text-amber-400'}>
                {account.ddsMade ?? 0}/{account.requiredDDCount} done
              </span>
            </div>
          )}
          {/* Minimum balance */}
          {(account.minimumBalance ?? 0) > 0 && !account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Min balance</span>
              <span>{fmt$(account.minimumBalance)}</span>
            </div>
          )}
          {account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Bonus received</span>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Opened Date</label>
              <input type="date" className={inp} value={draft.openedDate?.slice(0, 10) ?? ''} onChange={e => set('openedDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Amount ($)</label>
              <input type="number" min="0" className={inp} value={draft.bonusAmount ?? ''} onChange={e => set('bonusAmount', e.target.value)} placeholder="300" />
            </div>
          </div>

          {/* DD Requirements section */}
          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-zinc-300 mb-2">Direct Deposit Requirements</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">DD Amount ($)</label>
                <input type="number" min="0" className={inp} value={draft.requiredDD ?? ''} onChange={e => set('requiredDD', e.target.value)} placeholder="500" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1"># Required</label>
                <input type="number" min="1" className={inp} value={draft.requiredDDCount ?? ''} onChange={e => set('requiredDDCount', e.target.value)} placeholder="1" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1"># Completed</label>
                <input type="number" min="0" className={inp} value={draft.ddsMade ?? ''} onChange={e => set('ddsMade', e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">DD Deadline (days from open)</label>
                <input type="number" min="1" className={inp} value={draft.ddDeadlineDays ?? ''} onChange={e => set('ddDeadlineDays', e.target.value)} placeholder="90" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">DD Linked Date</label>
                <input type="date" className={inp} value={draft.ddLinkedDate?.slice(0, 10) ?? ''} onChange={e => set('ddLinkedDate', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">DD Source</label>
              <input className={inp} value={draft.ddSourceDescription ?? ''} onChange={e => set('ddSourceDescription', e.target.value)} placeholder="e.g. Payroll, Social Security, ACH" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Min Balance ($)</label>
              <input type="number" min="0" className={inp} value={draft.minimumBalance ?? ''} onChange={e => set('minimumBalance', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Deadline (days)</label>
              <input type="number" min="1" className={inp} value={draft.bonusDeadlineDays ?? ''} onChange={e => set('bonusDeadlineDays', e.target.value)} placeholder="120" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Received Date</label>
              <input type="date" className={inp} value={draft.bonusReceivedDate?.slice(0, 10) ?? ''} onChange={e => set('bonusReceivedDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Offer Link</label>
              <input className={inp} value={draft.offerUrl ?? ''} onChange={e => set('offerUrl', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={!!draft.isTaxable} onChange={e => set('isTaxable', e.target.checked)} />
            Bank bonus is taxable (1099-INT)
          </label>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="e.g. Offer terms, DD requirements, expiry" />
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
