import { useState, useEffect, useRef } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import { getSpendDeadlineInfo, getCardNextStatus, getReeligibilityInfo, getCardCloseShield } from '../../engines/lifecycle'
import { getCardAge } from '../../engines/creditAge'
import { getBurnRate } from '../../engines/burnRate'
import { valueCardBonus } from '../../engines/earnings'
import { CARD_STATUSES, statusLabel } from '../../utils/statusMeta'
import { fmt$, fmtPts, fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Zap, RotateCcw, Plus, X, Shield } from 'lucide-react'

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

const btnColors = {
  emerald: 'border border-edge-strong text-ink-tertiary hover:text-success-ink hover:border-success/50',
  amber:   'border border-edge-strong text-ink-tertiary hover:text-warning-ink hover:border-warning/50',
  blue:    'border border-edge-strong text-ink-tertiary hover:text-accent-ink hover:border-accent/50',
  red:     'border border-edge-strong text-ink-tertiary hover:text-danger-ink hover:border-danger/50',
  zinc:    'border border-edge-strong text-ink-tertiary hover:text-ink-secondary hover:border-edge-strong',
}

// Filled variants for the *primary* next-step action, so advancing a card's
// status is an obvious one-tap button instead of a faint outline.
const btnSolid = {
  emerald: 'bg-success text-white hover:bg-success/85 border border-transparent',
  amber:   'bg-warning text-black hover:bg-warning/85 border border-transparent',
  blue:    'bg-accent text-white hover:bg-accent-hover border border-transparent',
  red:     'bg-danger text-white hover:bg-danger/85 border border-transparent',
  zinc:    'bg-overlay text-ink hover:bg-overlay/80 border border-edge-strong',
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
    case 'Bonus Met': {
      // Once the 12-month close shield clears, closing/downgrading becomes the
      // suggested primary (solid) action; until then Keep Alive leads.
      const shield = getCardCloseShield(card)
      const keep = { label: '→ Keep Alive', color: 'zinc', payload: { status: 'Keep Alive' } }
      const close = { label: 'Close / Downgrade', color: 'red', payload: { status: 'Downgrade/Close Due' } }
      return shield?.safe ? [close, keep] : [keep, close]
    }
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

export default function CardItem({ card, members, autoOpenLogSpend = false }) {
  const { state, dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [showDowngradeInput, setShowDowngradeInput] = useState(false)
  const [downgradingTo, setDowngradingTo] = useState('')
  const [showLogSpend, setShowLogSpend] = useState(autoOpenLogSpend)
  const [logDraft, setLogDraft] = useState({ amount: '', note: '', date: new Date().toISOString().slice(0, 10) })
  const undoTimerRef = useRef(null)

  // Open the log-spend row when the command palette deep-links to it
  // (render-time state adjustment; no effect needed).
  const [prevAutoLog, setPrevAutoLog] = useState(autoOpenLogSpend)
  if (prevAutoLog !== autoOpenLogSpend) {
    setPrevAutoLog(autoOpenLogSpend)
    if (autoOpenLogSpend) setShowLogSpend(true)
  }

  const info = getSpendDeadlineInfo(card)
  const burn = getBurnRate(card)
  const closeShield = getCardCloseShield(card)
  // What this card is working toward — valued the same way the Earnings page
  // and Dashboard pipeline value bonuses (points never counted as raw dollars).
  const pipeline = card.status === 'Active Churn' && !card.bonusReceived && Number(card.bonusValue) > 0
    ? valueCardBonus(card, state.settings)
    : null
  const nextStatus = getCardNextStatus(card)
  const age = getCardAge(card)
  const quickActions = getQuickActions(card)
  const isClosed = card.status === 'Closed' || card.status === 'Downgraded'
  const reeligibility = isClosed ? getReeligibilityInfo(card) : null

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

  // Close the downgrade input whenever the card's status changes (render-time
  // state adjustment — avoids an extra effect pass).
  const [prevStatus, setPrevStatus] = useState(card.status)
  if (prevStatus !== card.status) {
    setPrevStatus(card.status)
    setShowDowngradeInput(false)
  }

  function startEdit() {
    setDraft({ ...card })
    setShowMore(false)
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
        bonusCashValue: draft.bonusCashValue !== '' && draft.bonusCashValue != null ? parseFloat(draft.bonusCashValue) : undefined,
        openDate: draft.openDate || null,
        lastUsedDate: draft.lastUsedDate || null,
        bonusReceivedDate: draft.bonusReceivedDate || null,
        closedDate: draft.closedDate || null,
        // spendLog is managed only via LOG_SPEND / DELETE_SPEND_ENTRY, never in
        // this form. Take it from the live card, not the draft snapshot, so a
        // log entry deleted while the form is open isn't resurrected on save.
        spendLog: card.spendLog ?? [],
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

  function submitLogSpend(e) {
    e.stopPropagation()
    const amount = parseFloat(logDraft.amount)
    if (!amount || amount <= 0) return
    dispatch({ type: 'LOG_SPEND', cardId: card.id, entry: { amount, note: logDraft.note.trim(), date: logDraft.date || new Date().toISOString().slice(0, 10) } })
    setLogDraft({ amount: '', note: '', date: new Date().toISOString().slice(0, 10) })
    setShowLogSpend(false)
  }

  function deleteLogEntry(entry) {
    dispatch({ type: 'DELETE_SPEND_ENTRY', cardId: card.id, entryId: entry.id })
    // Keep the open edit form's total in step with the card
    if (draft) {
      setDraft(d => ({ ...d, currentSpend: Math.max(0, (parseFloat(d.currentSpend) || 0) - (Number(entry.amount) || 0)) }))
    }
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

  function confirmDowngrade(e) {
    e.stopPropagation()
    if (card.status !== 'Downgrade/Close Due') return
    if (!downgradingTo.trim()) return
    // Clear any stale undo snapshot so it can't leave an orphan Keep Alive card
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoSnapshot(null)
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, status: 'Downgraded', downgradedToCard: downgradingTo.trim() } })
    dispatch({ type: 'ADD_CARD', payload: {
      memberId: card.memberId,
      cardName: downgradingTo.trim(),
      issuer: card.issuer,
      last4: card.last4,
      openDate: null, // user fills in — avoids inheriting original card's 5/24-counted open date
      status: 'Keep Alive',
      currentBalance: 0,
      creditLimit: card.creditLimit ?? 0,
      bonusReceived: false,
      isBusiness: card.isBusiness,
      isAuthorizedUser: card.isAuthorizedUser,
    }})
    setShowDowngradeInput(false)
    setDowngradingTo('')
  }

  // Edit form section visibility
  const showLastUsed = draft?.status === 'Keep Alive' || !!draft?.lastUsedDate
  const showEarnBonusSection = draft?.status === 'Active Churn'
    || Number(draft?.spendRequirement) > 0
    || Number(draft?.spendDeadlineDays) > 0
    || Number(draft?.currentSpend) > 0
  const showBonusSection = (draft?.status !== 'Closed' && draft?.status !== 'Downgraded')
    || Number(draft?.bonusValue) > 0
    || Number(draft?.annualFee) > 0
    || !!draft?.bonusReceived

  return (
    <div id={`item-${card.id}`} className="bg-surface border border-edge rounded-xl overflow-hidden hover:border-edge-strong transition-colors">
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
                <span className="font-semibold text-ink text-sm">{card.cardName}</span>
                {card.last4 && <span className="text-ink-tertiary text-xs">···{card.last4}</span>}
                {card.issuer && <span className="text-ink-tertiary text-xs">{card.issuer}</span>}
                {card.status === 'Downgraded' && card.downgradedToCard && (
                  <span className="text-xs text-ink-muted bg-raised px-1.5 py-0.5 rounded">
                    → {card.downgradedToCard}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                <PlayerBadge memberId={card.memberId} members={members} />
                <StatusBadge status={card.status} />
                {card.isAuthorizedUser && (
                  <span className="text-purple-700 dark:text-purple-300 text-xs bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">
                    Auth User
                  </span>
                )}
                {age && (
                  <span className="text-ink-tertiary text-xs bg-raised px-1.5 py-0.5 rounded">
                    {age.label}
                  </span>
                )}
                {card.annualFee > 0 && (
                  <span className="text-ink-muted text-xs bg-raised px-1.5 py-0.5 rounded">
                    ${Math.round(card.annualFee)}/yr
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {/* Quick spend logging for cards with an open spend requirement */}
            {burn && !expanded && (
              <button
                onClick={e => { e.stopPropagation(); setShowLogSpend(s => !s) }}
                title="Log spend"
                className="flex items-center gap-1 bg-raised hover:bg-accent text-ink-secondary hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
              >
                <Plus size={11} />
                <span>Log</span>
              </button>
            )}
            <span className="text-ink-tertiary">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </div>
        </div>

        {pipeline && (
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted">Bonus in pipeline</span>
            <span className="text-accent-ink font-medium tabular-nums">
              {card.bonusType === 'cashback'
                ? fmt$(pipeline.value)
                : <>{fmtPts(card.bonusValue)} {card.bonusType === 'miles' ? 'miles' : 'pts'}{' '}
                    <span className="text-ink-muted font-normal">≈ {fmt$(pipeline.value)}{pipeline.estimated ? ' est.' : ''}</span></>}
            </span>
          </div>
        )}

        {info && !info.met && (
          <div className="mt-2">
            <div className="h-1.5 bg-overlay rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${info.daysLeft < 14 ? 'bg-danger' : info.daysLeft < 30 ? 'bg-warning' : 'bg-info'}`} style={{ width: `${info.pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span>{fmt$(card.currentSpend ?? 0)} / {fmt$(card.spendRequirement ?? 0)} spend</span>
              <span className={info.daysLeft < 14 ? 'text-danger-ink font-medium' : ''}>{info.daysLeft}d left</span>
            </div>
            {burn && (
              <div className={`text-[11px] mt-1 ${burn.onTrack ? 'text-success-ink' : 'text-warning-ink'}`}>
                {burn.overdue
                  ? 'Past deadline — call the issuer about an extension'
                  : burn.onTrack && burn.projectedDate
                  ? `On pace — projected done ${new Date(burn.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : burn.stalled
                  ? `No recent spend — need ${fmt$(burn.neededPerWeek)}/wk`
                  : `Off pace — need ${fmt$(burn.neededPerWeek)}/wk (current ~${fmt$(burn.perWeek)}/wk)`}
              </div>
            )}
          </div>
        )}

        {/* Keep Alive: last-known-used date with a quiet one-tap "Used today"
            pill beside it — replaces the old solid Used button in the header */}
        {card.status === 'Keep Alive' && !expanded && (
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
            <span>Last used <span className="text-ink font-medium">{card.lastUsedDate ? fmtDate(card.lastUsedDate) : '—'}</span></span>
            <button
              onClick={markUsedToday}
              title="Mark used today"
              className="flex items-center gap-1 border border-edge-strong text-ink-tertiary hover:text-success-ink hover:border-success/50 px-2.5 py-1 rounded-full transition-colors flex-shrink-0"
            >
              <Zap size={11} />
              <span>Used today</span>
            </button>
          </div>
        )}

        {/* 12-month close shield — shown for any open card with an earned bonus */}
        {closeShield && (
          <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${closeShield.safe ? 'text-success-ink' : 'text-warning-ink'}`}>
            <Shield size={11} className="flex-shrink-0" />
            <span>
              {closeShield.message}
              {!closeShield.safe && closeShield.safeDate && <> ({fmtDate(closeShield.safeDate)})</>}
            </span>
          </div>
        )}

        {isClosed ? (
          reeligibility && reeligibility.months ? (
            reeligibility.reeligible ? (
              <div className="mt-2">
                <div className="h-1.5 bg-overlay rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full bg-success w-full" />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-tertiary">Re-eligibility</span>
                  <span className="text-success-ink font-medium">Ready to reapply</span>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <div className="h-1.5 bg-overlay rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-ink-tertiary"
                    style={{ width: `${Math.max(2, Math.round(((reeligibility.months * 30 - reeligibility.daysUntil) / (reeligibility.months * 30)) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-ink-tertiary">
                  <span>Re-eligible in {reeligibility.daysUntil}d</span>
                  <span>{new Date(reeligibility.reeligibleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            )
          ) : reeligibility && !reeligibility.months ? (
            <div className="mt-1.5 text-xs text-ink-faint">{reeligibility.note}</div>
          ) : (
            <div className="mt-1.5 text-xs text-ink-faint">Re-eligibility tracked after bonus is earned</div>
          )
        ) : (
          nextStatus && !expanded && (
            <div className="mt-2 text-xs text-warning-ink">→ {statusLabel(nextStatus)}</div>
          )
        )}
      </div>

      {/* Quick action buttons — only shown when collapsed */}
      {!expanded && (quickActions.length > 0 || undoSnapshot || showLogSpend) && (
        <div className="px-4 pb-3 pt-0 flex gap-2 flex-wrap items-center border-t border-edge">
          {showLogSpend ? (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-ink-faint uppercase tracking-wider font-medium flex-shrink-0">Log spend</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={logDraft.amount}
                onChange={e => setLogDraft(d => ({ ...d, amount: e.target.value }))}
                placeholder="$ amount"
                aria-label="Spend amount"
                className="w-24 bg-raised border border-edge-strong rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent"
                onKeyDown={e => { if (e.key === 'Enter') submitLogSpend(e); if (e.key === 'Escape') { e.stopPropagation(); setShowLogSpend(false) } }}
              />
              <input
                value={logDraft.note}
                onChange={e => setLogDraft(d => ({ ...d, note: e.target.value }))}
                placeholder="note (optional)"
                aria-label="Spend note"
                className="flex-1 min-w-[90px] bg-raised border border-edge-strong rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent"
                onKeyDown={e => { if (e.key === 'Enter') submitLogSpend(e); if (e.key === 'Escape') { e.stopPropagation(); setShowLogSpend(false) } }}
              />
              <input
                type="date"
                value={logDraft.date}
                onChange={e => setLogDraft(d => ({ ...d, date: e.target.value }))}
                aria-label="Spend date"
                className="bg-raised border border-edge-strong rounded-lg px-2 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
              />
              <button onClick={e => { e.stopPropagation(); setShowLogSpend(false) }} aria-label="Cancel logging spend" className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${btnColors.zinc}`}><X size={12} /></button>
              <button onClick={submitLogSpend} disabled={!(parseFloat(logDraft.amount) > 0)} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${btnColors.emerald}`}>Add</button>
            </div>
          ) : showDowngradeInput ? (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={downgradingTo}
                onChange={e => setDowngradingTo(e.target.value)}
                placeholder="New free card name (e.g. Freedom)"
                className="flex-1 min-w-0 bg-raised border border-edge-strong rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent"
                onKeyDown={e => { if (e.key === 'Enter') confirmDowngrade(e); if (e.key === 'Escape') { e.stopPropagation(); setShowDowngradeInput(false) } }}
              />
              <button onClick={e => { e.stopPropagation(); setShowDowngradeInput(false) }} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${btnColors.zinc}`}>Cancel</button>
              <button onClick={confirmDowngrade} disabled={!downgradingTo.trim()} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${btnColors.emerald}`}>Confirm</button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center">
              <span className="text-[10px] text-ink-faint uppercase tracking-wider font-medium flex-shrink-0">Mark as</span>
              {quickActions.map((action, i) => (
                <button
                  key={action.label}
                  onClick={e => applyQuickAction(e, action.payload)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                    i === 0 ? (btnSolid[action.color] ?? btnSolid.zinc) : (btnColors[action.color] ?? btnColors.zinc)
                  }`}
                >
                  {action.label}
                </button>
              ))}
              {card.status === 'Downgrade/Close Due' && (
                <button
                  onClick={e => { e.stopPropagation(); setShowDowngradeInput(true) }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${btnColors.blue}`}
                >
                  Downgrade →
                </button>
              )}
            </div>
          )}
          {!showDowngradeInput && !showLogSpend && undoSnapshot && (
            <button
              onClick={undoAction}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium bg-raised hover:bg-overlay border border-edge-strong text-ink-muted hover:text-ink transition-colors mt-2.5 ml-auto flex-shrink-0"
            >
              <RotateCcw size={11} />
              Undo
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation — shown inline so the card doesn't collapse on mobile */}
      {expanded && confirming && (
        <div className="border-t border-edge-strong p-4">
          <p className="text-sm text-ink-secondary mb-3">Delete <strong className="text-ink">{card.cardName}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} className="flex-1 bg-danger hover:bg-danger/85 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Expanded edit form */}
      {expanded && draft && !confirming && (
        <div className="border-t border-edge-strong p-4 space-y-3">

          {/* Core */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-muted block mb-1">Person</label>
              <select className={inp} value={draft.memberId ?? ''} onChange={e => set('memberId', e.target.value)}>
                {(members ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-muted block mb-1">Status</label>
              <select className={inp} value={draft.status ?? 'Active Churn'} onChange={e => set('status', e.target.value)}>
                {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-accent-ink block mb-1 font-medium">Card Name <span className="text-accent-ink">*required</span></label>
            <input className={inpRequired} value={draft.cardName ?? ''} onChange={e => set('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Issuer</label>
              <input list="issuers" className={inp} value={draft.issuer ?? ''} onChange={e => set('issuer', e.target.value)} placeholder="Chase" />
              <datalist id="issuers">
                {['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover'].map(i => <option key={i} value={i} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Last 4</label>
              <input className={inp} value={draft.last4 ?? ''} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
            </div>
          </div>

          {/* Dates */}
          <div className={`grid gap-2 ${showLastUsed ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Open Date</label>
              <DateField value={draft.openDate} onChange={v => set('openDate', v)} />
            </div>
            {showLastUsed && (
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Last Used</label>
                <DateField value={draft.lastUsedDate} onChange={v => set('lastUsedDate', v)} />
              </div>
            )}
          </div>

          {/* Earning Bonus — only shown for Active Churn or when spend data exists */}
          {showEarnBonusSection && (
            <div className="bg-raised/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-ink-secondary mb-2">Earning Bonus</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Spend Req ($)</label>
                  <input type="number" min="0" className={inp} value={draft.spendRequirement ?? ''} onChange={e => set('spendRequirement', e.target.value)} placeholder="4000" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Days</label>
                  <input type="number" min="1" className={inp} value={draft.spendDeadlineDays ?? ''} onChange={e => set('spendDeadlineDays', e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Spent ($)</label>
                  <input type="number" min="0" className={inp} value={draft.currentSpend ?? ''} onChange={e => set('currentSpend', e.target.value)} placeholder="0" />
                </div>
              </div>
              {(card.spendLog ?? []).length > 0 ? (
                <div className="pt-1">
                  <div className="text-xs text-ink-tertiary mb-1.5">Spend log</div>
                  <ul className="space-y-1">
                    {[...card.spendLog].sort((a, b) => new Date(b.date) - new Date(a.date)).map(entry => (
                      <li key={entry.id} className="flex items-center gap-2 text-xs bg-raised/60 rounded-md px-2 py-1.5">
                        <span className="text-ink-tertiary w-20 flex-shrink-0">{fmtDate(entry.date)}</span>
                        <span className="text-ink font-medium tabular-nums">{fmt$(entry.amount)}</span>
                        {entry.note && <span className="text-ink-muted truncate flex-1">{entry.note}</span>}
                        <button
                          onClick={() => deleteLogEntry(entry)}
                          aria-label={`Delete ${fmt$(entry.amount)} entry`}
                          className="ml-auto text-ink-faint hover:text-danger-ink transition-colors flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-ink-faint mt-1.5">Deleting an entry subtracts it from the total. The Spent field still works for manual totals.</p>
                </div>
              ) : (
                <p className="text-[11px] text-ink-faint">Tip: the “+ Log” button on the collapsed card itemizes spend and powers the pace projection.</p>
              )}
            </div>
          )}

          {/* Bonus & Rewards — hidden for Closed cards unless data exists */}
          {showBonusSection && (
            <div className="bg-raised/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-ink-secondary mb-2">Bonus & Rewards</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus</label>
                  <input type="number" min="0" className={inp} value={draft.bonusValue ?? ''} onChange={e => set('bonusValue', e.target.value)} placeholder="pts/$" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Type</label>
                  <select className={inp} value={draft.bonusType ?? 'cashback'} onChange={e => set('bonusType', e.target.value)}>
                    <option value="points">Points</option>
                    <option value="cashback">Cash</option>
                    <option value="miles">Miles</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Annual Fee ($)</label>
                  <input type="number" min="0" className={inp} value={draft.annualFee ?? ''} onChange={e => set('annualFee', e.target.value)} placeholder="0" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                <input type="checkbox" checked={!!draft.bonusReceived} onChange={e => set('bonusReceived', e.target.checked)} />
                Bonus received
              </label>
              {draft.bonusReceived && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus Received Date</label>
                  <DateField value={draft.bonusReceivedDate} onChange={v => set('bonusReceivedDate', v)} />
                </div>
              )}
              {draft.bonusReceived && draft.bonusType !== 'cashback' && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus Cash Value ($)</label>
                  <input type="number" min="0" className={inp} value={draft.bonusCashValue ?? ''} onChange={e => set('bonusCashValue', e.target.value)} placeholder="what the points were worth" />
                  <p className="text-[11px] text-ink-faint mt-1">Used by Earnings. Blank = valued at the default rate in Settings.</p>
                </div>
              )}
              {Number(draft.annualFee) > 0 && (
                <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                  <input type="checkbox" checked={!!draft.feeWaivedFirstYear} onChange={e => set('feeWaivedFirstYear', e.target.checked)} />
                  First-year fee waived
                </label>
              )}
            </div>
          )}

          {/* Closed date — for accurate fee history on retired cards */}
          {(draft.status === 'Closed' || draft.status === 'Downgraded' || !!draft.closedDate) && (
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Closed / Downgraded Date</label>
              <DateField value={draft.closedDate} onChange={v => set('closedDate', v)} />
              <p className="text-[11px] text-ink-faint mt-1">Stops the Earnings fee estimate at this date.</p>
            </div>
          )}

          {/* Card Type */}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
              <input type="checkbox" checked={!!draft.isBusiness} onChange={e => set('isBusiness', e.target.checked)} />
              Business card
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
              <input type="checkbox" checked={!!draft.isAuthorizedUser} onChange={e => set('isAuthorizedUser', e.target.checked)} />
              Authorized user
            </label>
          </div>
          <p className="text-xs text-ink-faint -mt-1">Business & authorized-user cards are excluded from Chase 5/24.</p>

          {/* Optional extras — balance, limit, notes. Balance isn't something
              most churners update often, so it's collapsed by default. */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
            >
              {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              More details (optional)
            </button>
            {showMore && (
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Current Balance ($)</label>
                    <input type="number" min="0" className={inp} value={draft.currentBalance ?? ''} onChange={e => set('currentBalance', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Credit Limit ($)</label>
                    <input type="number" min="0" className={inp} value={draft.creditLimit ?? ''} onChange={e => set('creditLimit', e.target.value)} placeholder="optional" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
                  <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="optional" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-ink-tertiary hover:text-danger-ink transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.cardName?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
