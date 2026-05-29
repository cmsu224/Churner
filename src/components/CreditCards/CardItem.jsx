import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import { getSpendDeadlineInfo, getCardNextStatus } from '../../engines/lifecycle'
import { fmt$, fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, AlertCircle, CheckCircle, Zap } from 'lucide-react'

const STATUSES = ['Applied', 'Active Churn', 'Bonus Met', 'Retention Call Due', 'Downgrade/Close Due', 'Closed']
const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

export default function CardItem({ card, players }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const info = getSpendDeadlineInfo(card)
  const nextStatus = getCardNextStatus(card)

  function startEdit() {
    setDraft({ ...card })
    setExpanded(true)
  }

  function cancelEdit() {
    setDraft(null)
    setExpanded(false)
  }

  function saveEdit() {
    if (!draft?.cardName?.trim()) return
    dispatch({
      type: 'UPDATE_CARD', payload: {
        ...draft,
        spendRequirement: draft.spendRequirement !== '' && draft.spendRequirement != null ? parseFloat(draft.spendRequirement) : undefined,
        spendDeadlineDays: draft.spendDeadlineDays !== '' && draft.spendDeadlineDays != null ? parseInt(draft.spendDeadlineDays) : undefined,
        currentSpend: draft.currentSpend !== '' && draft.currentSpend != null ? parseFloat(draft.currentSpend) || 0 : 0,
        bonusValue: draft.bonusValue !== '' && draft.bonusValue != null ? parseFloat(draft.bonusValue) || 0 : 0,
        annualFee: draft.annualFee !== '' && draft.annualFee != null ? parseFloat(draft.annualFee) || 0 : 0,
        openDate: draft.openDate || null,
        lastUsedDate: draft.lastUsedDate || null,
        bonusReceivedDate: draft.bonusReceivedDate || null,
      }
    })
    setDraft(null)
    setExpanded(false)
  }

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function markUsedToday(e) {
    e.stopPropagation()
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, lastUsedDate: new Date().toISOString().slice(0, 10) } })
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_CARD', id: card.id })
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="bg-zinc-900 border border-red-500/30 rounded-xl p-4">
        <p className="text-sm text-zinc-300 mb-3">Delete <strong className="text-white">{card.cardName}</strong>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
      {/* Collapsed header — always visible, tap to expand */}
      <button
        className="w-full text-left p-4"
        onClick={() => expanded ? cancelEdit() : startEdit()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{card.cardName}</span>
              {card.last4 && <span className="text-zinc-500 text-xs">···{card.last4}</span>}
              {card.issuer && <span className="text-zinc-500 text-xs">{card.issuer}</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <PlayerBadge playerId={card.playerId} players={players} />
              <StatusBadge status={card.status} />
              {card.autoPayEnabled
                ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle size={10} />AutoPay</span>
                : <span className="inline-flex items-center gap-1 text-xs text-red-400"><AlertCircle size={10} />No AutoPay</span>
              }
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={markUsedToday}
              title="Mark used today"
              className="flex items-center gap-1 bg-zinc-700 hover:bg-emerald-700 text-zinc-300 hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
            >
              <Zap size={11} />
              <span>Used</span>
            </button>
            <span className="text-zinc-500">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
          </div>
        </div>

        {info && !info.met && (
          <div className="mt-2">
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${info.daysLeft < 14 ? 'bg-red-500' : info.daysLeft < 30 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${info.pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{fmt$(card.currentSpend ?? 0)} / {fmt$(card.spendRequirement ?? 0)}</span>
              <span className={info.daysLeft < 14 ? 'text-red-400 font-medium' : ''}>{info.daysLeft}d left</span>
            </div>
          </div>
        )}
        {info?.met && <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle size={10} />Spend met</div>}
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
              <select className={inp} value={draft.status ?? 'Active Churn'} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Card Name <span className="text-red-400">*</span></label>
            <input className={inp} value={draft.cardName ?? ''} onChange={e => set('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Issuer</label>
              <input list="issuers" className={inp} value={draft.issuer ?? ''} onChange={e => set('issuer', e.target.value)} placeholder="Chase" />
              <datalist id="issuers">
                {['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover'].map(i => <option key={i} value={i} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Last 4</label>
              <input className={inp} value={draft.last4 ?? ''} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Open Date</label>
              <input type="date" className={inp} value={draft.openDate?.slice(0, 10) ?? ''} onChange={e => set('openDate', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Last Used</label>
              <input type="date" className={inp} value={draft.lastUsedDate?.slice(0, 10) ?? ''} onChange={e => set('lastUsedDate', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Spend Req ($)</label>
              <input type="number" min="0" className={inp} value={draft.spendRequirement ?? ''} onChange={e => set('spendRequirement', e.target.value)} placeholder="4000" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Days</label>
              <input type="number" min="1" className={inp} value={draft.spendDeadlineDays ?? ''} onChange={e => set('spendDeadlineDays', e.target.value)} placeholder="90" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Spent ($)</label>
              <input type="number" min="0" className={inp} value={draft.currentSpend ?? ''} onChange={e => set('currentSpend', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus</label>
              <input type="number" min="0" className={inp} value={draft.bonusValue ?? ''} onChange={e => set('bonusValue', e.target.value)} placeholder="pts/$" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Type</label>
              <select className={inp} value={draft.bonusType ?? 'cashback'} onChange={e => set('bonusType', e.target.value)}>
                <option value="points">Points</option>
                <option value="cashback">Cash</option>
                <option value="miles">Miles</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Annual Fee</label>
              <input type="number" min="0" className={inp} value={draft.annualFee ?? ''} onChange={e => set('annualFee', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!draft.bonusReceived} onChange={e => set('bonusReceived', e.target.checked)} />
              Bonus received
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!draft.autoPayEnabled} onChange={e => set('autoPayEnabled', e.target.checked)} />
              AutoPay on
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!draft.isPrimary} onChange={e => set('isPrimary', e.target.checked)} />
              Personal (5/24)
            </label>
          </div>

          {draft.bonusReceived && (
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Bonus Received Date</label>
              <input type="date" className={inp} value={draft.bonusReceivedDate?.slice(0, 10) ?? ''} onChange={e => set('bonusReceivedDate', e.target.value)} />
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-400 block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="optional" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.cardName?.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
