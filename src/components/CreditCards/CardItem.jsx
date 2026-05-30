import { useState, useEffect, useRef } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import BalanceBar from '../shared/BalanceBar'
import DateField from '../shared/DateField'
import { getSpendDeadlineInfo, getCardNextStatus } from '../../engines/lifecycle'
import { getCardAge } from '../../engines/creditAge'
import { CARD_STATUSES, statusLabel } from '../../utils/statusMeta'
import { fmt$ } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Zap, RotateCcw } from 'lucide-react'

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'
const inpRequired = 'w-full bg-zinc-800 border border-blue-500/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 transition-colors'

const btnColors = {
  emerald: 'bg-emerald-900/40 hover:bg-emerald-700 border border-emerald-700/50 text-emerald-300 hover:text-white',
  amber:   'bg-amber-900/40 hover:bg-amber-700 border border-amber-700/50 text-amber-300 hover:text-white',
  blue:    'bg-blue-900/40 hover:bg-blue-700 border border-blue-700/50 text-blue-300 hover:text-white',
  red:     'bg-red-900/40 hover:bg-red-700 border border-red-700/50 text-red-300 hover:text-white',
  zinc:    'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white',
}

function getQuickActions(card) {
  const today = new Date().toISOString().slice(0, 10)
  const hasBonus = Number(card.spendRequirement) > 0 || Number(card.bonusValue) > 0
  switch (card.status) {
    case 'Applied':
      return [
        { label: 'Card Arrived', color: 'blue', payload: { status: 'Active Churn' } },
      ]
    case 'Active Churn':
      return hasBonus
        ? [{ label: '✓ Bonus Received', color: 'emerald', payload: { bonusReceived: true, status: 'Bonus Met', bonusReceivedDate: today } }]
        : [{ label: '→ Keep Alive', color: 'zinc', payload: { status: 'Keep Alive' } }]
    case 'Bonus Met':
      return [
        { label: '→ Keep Alive', color: 'zinc', payload: { status: 'Keep Alive' } },
        { label: 'Close / Downgrade', color: 'red', payload: { status: 'Downgrade/Close Due' } },
      ]
    case 'Keep Alive':
      return [
        { label: 'Close / Downgrade', color: 'red', payload: { status: 'Downgrade/Close Due' } },
      ]
    case 'Downgrade/Close Due':
      return [
        { label: '✓ Mark Closed', color: 'red', payload: { status: 'Closed' } },
        { label: 'Keep It', color: 'emerald', payload: { status: 'Keep Alive' } },
      ]
    default:
      return []
  }
}

export default function CardItem({ card, members }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const undoTimerRef = useRef(null)

  const info = getSpendDeadlineInfo(card)
  const nextStatus = getCardNextStatus(card)
  const age = getCardAge(card)
  const quickActions = getQuickActions(card)

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

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
        currentBalance: draft.currentBalance !== '' && draft.currentBalance != null ? parseFloat(draft.currentBalance) || 0 : 0,
        creditLimit: draft.creditLimit !== '' && draft.creditLimit != null ? parseFloat(draft.creditLimit) || 0 : 0,
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

  function applyQuickAction(e, payload) {
    e.stopPropagation()
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoSnapshot({ ...card })
    undoTimerRef.current = setTimeout(() => setUndoSnapshot(null), 6000)
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, ...payload } })
  }

  function undoAction(e) {
    e.stopPropagation()
    if (!undoSnapshot) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    dispatch({ type: 'UPDATE_CARD', payload: undoSnapshot })
    setUndoSnapshot(null)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_CARD', id: card.id })
    setConfirming(false)
  }

  // Edit form section visibility
  const showLastUsed = draft?.status === 'Keep Alive' || !!draft?.lastUsedDate
  const showEarnBonusSection = draft?.status === 'Active Churn'
    || Number(draft?.spendRequirement) > 0
    || Number(draft?.spendDeadlineDays) > 0
    || Number(draft?.currentSpend) > 0
  const showBonusSection = draft?.status !== 'Closed'
    || Number(draft?.bonusValue) > 0
    || Number(draft?.annualFee) > 0
    || !!draft?.bonusReceived

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
      {/* Collapsed header */}
      <div
        className="w-full p-4 cursor-pointer select-none"
        onClick={() => expanded ? cancelEdit() : startEdit()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <IssuerLogo name={card.issuer || card.cardName} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{card.cardName}</span>
                {card.last4 && <span className="text-zinc-500 text-xs">···{card.last4}</span>}
                {card.issuer && <span className="text-zinc-500 text-xs">{card.issuer}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                <PlayerBadge memberId={card.memberId} members={members} />
                <StatusBadge status={card.status} />
                {card.isAuthorizedUser && (
                  <span className="text-purple-300 text-xs bg-purple-900/30 border border-purple-700/40 px-1.5 py-0.5 rounded">
                    Auth User
                  </span>
                )}
                {age && (
                  <span className="text-zinc-500 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                    {age.label}
                  </span>
                )}
                {card.annualFee > 0 && (
                  <span className="text-zinc-400 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                    ${Math.round(card.annualFee)}/yr
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* Only show for Keep Alive cards — confirms card is still being used */}
            {card.status === 'Keep Alive' && (
              <button
                onClick={markUsedToday}
                title="Mark used today"
                className="flex items-center gap-1 bg-zinc-700 hover:bg-emerald-700 text-zinc-300 hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
              >
                <Zap size={11} />
                <span>Used</span>
              </button>
            )}
            <span className="text-zinc-500">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </div>
        </div>

        {info && !info.met && (
          <div className="mt-2">
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${info.daysLeft < 14 ? 'bg-red-500' : info.daysLeft < 30 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${info.pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{fmt$(card.currentSpend ?? 0)} / {fmt$(card.spendRequirement ?? 0)} spend</span>
              <span className={info.daysLeft < 14 ? 'text-red-400 font-medium' : ''}>{info.daysLeft}d left</span>
            </div>
          </div>
        )}

        <BalanceBar balance={card.currentBalance ?? 0} limit={card.creditLimit ?? 0} kind="card" />

        {nextStatus && !expanded && (
          <div className="mt-1.5 text-xs text-amber-400">→ {statusLabel(nextStatus)}</div>
        )}
      </div>

      {/* Quick action buttons — only shown when collapsed */}
      {!expanded && (quickActions.length > 0 || undoSnapshot) && (
        <div className="px-4 pb-3 pt-0 flex gap-2 flex-wrap items-center border-t border-zinc-800">
          <div className="flex gap-2 flex-wrap pt-2.5 flex-1">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={e => applyQuickAction(e, action.payload)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${btnColors[action.color] ?? btnColors.zinc}`}
              >
                {action.label}
              </button>
            ))}
          </div>
          {undoSnapshot && (
            <button
              onClick={undoAction}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-400 hover:text-white transition-colors mt-2.5 ml-auto flex-shrink-0"
            >
              <RotateCcw size={11} />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation — shown inline so the card doesn't collapse on mobile */}
      {expanded && confirming && (
        <div className="border-t border-zinc-700 p-4">
          <p className="text-sm text-zinc-300 mb-3">Delete <strong className="text-white">{card.cardName}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Expanded edit form */}
      {expanded && draft && !confirming && (
        <div className="border-t border-zinc-700 p-4 space-y-3">

          {/* Core */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Person</label>
              <select className={inp} value={draft.memberId ?? ''} onChange={e => set('memberId', e.target.value)}>
                {(members ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Status</label>
              <select className={inp} value={draft.status ?? 'Active Churn'} onChange={e => set('status', e.target.value)}>
                {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-blue-400 block mb-1 font-medium">Card Name <span className="text-blue-400">*required</span></label>
            <input className={inpRequired} value={draft.cardName ?? ''} onChange={e => set('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Issuer</label>
              <input list="issuers" className={inp} value={draft.issuer ?? ''} onChange={e => set('issuer', e.target.value)} placeholder="Chase" />
              <datalist id="issuers">
                {['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover'].map(i => <option key={i} value={i} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Last 4</label>
              <input className={inp} value={draft.last4 ?? ''} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
            </div>
          </div>

          {/* Dates */}
          <div className={`grid gap-2 ${showLastUsed ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Open Date</label>
              <DateField value={draft.openDate} onChange={v => set('openDate', v)} />
            </div>
            {showLastUsed && (
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Last Used</label>
                <DateField value={draft.lastUsedDate} onChange={v => set('lastUsedDate', v)} />
              </div>
            )}
          </div>

          {/* Balance */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Current Balance ($)</label>
              <input type="number" min="0" className={inp} value={draft.currentBalance ?? ''} onChange={e => set('currentBalance', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Credit Limit ($)</label>
              <input type="number" min="0" className={inp} value={draft.creditLimit ?? ''} onChange={e => set('creditLimit', e.target.value)} placeholder="optional" />
            </div>
          </div>

          {/* Earning Bonus — only shown for Active Churn or when spend data exists */}
          {showEarnBonusSection && (
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-300 mb-2">Earning Bonus</div>
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
            </div>
          )}

          {/* Bonus & Rewards — hidden for Closed cards unless data exists */}
          {showBonusSection && (
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-300 mb-2">Bonus & Rewards</div>
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
                  <label className="text-xs text-zinc-400 block mb-1">Annual Fee ($)</label>
                  <input type="number" min="0" className={inp} value={draft.annualFee ?? ''} onChange={e => set('annualFee', e.target.value)} placeholder="0" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={!!draft.bonusReceived} onChange={e => set('bonusReceived', e.target.checked)} />
                Bonus received
              </label>
              {draft.bonusReceived && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Bonus Received Date</label>
                  <DateField value={draft.bonusReceivedDate} onChange={v => set('bonusReceivedDate', v)} />
                </div>
              )}
            </div>
          )}

          {/* Card Type */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!draft.isBusiness} onChange={e => set('isBusiness', e.target.checked)} />
              Business card
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!draft.isAuthorizedUser} onChange={e => set('isAuthorizedUser', e.target.checked)} />
              Authorized user
            </label>
          </div>
          <p className="text-xs text-zinc-600 -mt-1">Business & authorized-user cards are excluded from Chase 5/24.</p>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Notes</label>
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
