import { useState, useEffect, useRef } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountNextStatus } from '../../engines/lifecycle'
import { ACCOUNT_STATUSES } from '../../utils/statusMeta'
import { fmt$, fmtDate, todayISODate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Shield, ExternalLink, RotateCcw } from 'lucide-react'

const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
// Statuses that mean the bonus already landed (matches the Earnings and Tax
// engines, so all three agree on what "received" means).
const RECEIVED_STATUSES = ['Bonus Received', 'Cooling Period', 'Safe to Close', 'Closed']
const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

// Same button grammar as the credit-card quick actions: the primary next step
// is a solid, filled button; anything else stays outlined.
const btnColors = {
  emerald: 'border border-edge-strong text-ink-tertiary hover:text-success-ink hover:border-success/50',
  blue:    'border border-edge-strong text-ink-tertiary hover:text-accent-ink hover:border-accent/50',
  red:     'border border-edge-strong text-ink-tertiary hover:text-danger-ink hover:border-danger/50',
  zinc:    'border border-edge-strong text-ink-tertiary hover:text-ink-secondary hover:border-edge-strong',
}
const btnSolid = {
  emerald: 'bg-success text-white hover:bg-success/85 border border-transparent',
  blue:    'bg-accent text-white hover:bg-accent-hover border border-transparent',
  red:     'bg-danger text-white hover:bg-danger/85 border border-transparent',
  zinc:    'bg-overlay text-ink hover:bg-overlay/80 border border-edge-strong',
}

// The account's next step in the bonus lifecycle, as one-tap buttons — the bank
// counterpart to the card status actions. Logging direct deposits leads while
// any are still outstanding, because that's the actual work between opening the
// account and the bonus landing; after the bonus posts the 181-day clawback
// rule (getAccountNextStatus) decides between holding and closing.
function getAccountQuickActions(account, nextStatus) {
  const today = todayISODate()
  const needed = account.requiredDDCount ?? 1
  const made = account.ddsMade ?? 0
  const needsDD = Number(account.requiredDD) > 0 || Number(account.requiredDDCount) > 0 || !!account.ddSourceDescription

  const logDD = needed > 1
    ? { label: `+ Direct Deposit ${Math.min(made + 1, needed)}/${needed}`, color: 'blue',
        payload: { ddsMade: made + 1, status: 'DD Linked', ddLinkedDate: account.ddLinkedDate || today } }
    : { label: '✓ Direct Deposit Linked', color: 'blue',
        payload: { ddsMade: Math.max(made, 1), status: 'DD Linked', ddLinkedDate: account.ddLinkedDate || today } }
  // Sets the received date as well as the status — that date is what puts the
  // bonus in the right tax year and starts the clawback countdown.
  const bonusPosted = { label: '✓ Bonus Posted', color: 'emerald',
    payload: { status: 'Bonus Received', bonusReceived: true, bonusReceivedDate: account.bonusReceivedDate || today } }
  const pending = { label: '→ Bonus Pending', color: 'zinc', payload: { status: 'Bonus Pending' } }

  switch (account.status || 'Opened') {
    case 'Opened':
      return needsDD ? [logDD, bonusPosted] : [{ ...pending, color: 'blue' }, bonusPosted]
    case 'DD Linked':
      return made < needed ? [logDD, bonusPosted] : [bonusPosted, pending]
    case 'Bonus Pending':
      return [bonusPosted]
    case 'Bonus Received':
    case 'Cooling Period':
      if (nextStatus === 'Safe to Close') return [{ label: '✓ Safe to Close', color: 'emerald', payload: { status: 'Safe to Close' } }]
      if (nextStatus === 'Cooling Period') return [{ label: '→ Holding (Clawback)', color: 'zinc', payload: { status: 'Cooling Period' } }]
      return []
    case 'Safe to Close':
      return [{ label: '✓ Mark Closed', color: 'red', payload: { status: 'Closed' } }]
    default:
      return []
  }
}

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

export default function AccountItem({ account, members }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const undoTimerRef = useRef(null)

  const shield = getClawbackStatus(account)
  const nextStatus = getAccountNextStatus(account)
  const ddInfo = ddDeadlineInfo(account)
  const quickActions = getAccountQuickActions(account, nextStatus)

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

  function applyQuickAction(e, payload) {
    e.stopPropagation()
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoSnapshot({ ...account })
    undoTimerRef.current = setTimeout(() => setUndoSnapshot(null), 6000)
    dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...account, ...payload } })
  }

  function undoAction(e) {
    e.stopPropagation()
    if (!undoSnapshot) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    dispatch({ type: 'UPDATE_ACCOUNT', payload: undoSnapshot })
    setUndoSnapshot(null)
  }

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
        currentBalance: draft.currentBalance !== '' && draft.currentBalance != null ? parseFloat(draft.currentBalance) || 0 : 0,
        minimumBalance: numOpt(draft.minimumBalance),
        ddDeadlineDays: intOpt(draft.ddDeadlineDays),
        requiredDDCount: intOpt(draft.requiredDDCount),
        ddsMade: intOpt(draft.ddsMade),
        bonusDeadlineDays: intOpt(draft.bonusDeadlineDays),
        etfDays: intOpt(draft.etfDays),
        last4: draft.last4 ? String(draft.last4).slice(-4) : undefined,
        openedDate,
        ddLinkedDate: draft.ddLinkedDate || null,
        bonusReceivedDate: draft.bonusReceivedDate || null,
        // Keep the stored flag in step with what the form actually captures
        // (the date and the status), so exports and the tax page agree.
        bonusReceived: !!draft.bonusReceivedDate || RECEIVED_STATUSES.includes(draft.status),
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
      <div className="bg-surface border border-danger/30 rounded-xl p-4">
        <p className="text-sm text-ink-secondary mb-3">Delete <strong className="text-ink">{account.bankName}</strong>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} className="flex-1 bg-danger hover:bg-danger/85 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    )
  }

  // Edit form section visibility
  const showBonusSection = draft
    ? (Number(draft.bonusAmount) > 0
      || !!draft.bonusReceivedDate
      || ['Opened', 'DD Linked', 'Bonus Pending', 'Bonus Received'].includes(draft.status))
    : false

  const showDDSection = draft
    ? (Number(draft.requiredDD) > 0
      || Number(draft.requiredDDCount) > 0
      || !!draft.ddLinkedDate
      || !!draft.ddSourceDescription
      || ['Opened', 'DD Linked'].includes(draft.status))
    : false

  const showMinBalance = draft
    ? (Number(draft.minimumBalance) > 0
      || ['Opened', 'DD Linked', 'Bonus Pending'].includes(draft.status))
    : false

  const showBonusReceivedDate = draft
    ? (draft.status === 'Bonus Received' || !!draft.bonusReceivedDate)
    : false

  return (
    <div id={`item-${account.id}`} className="bg-surface border border-edge rounded-xl overflow-hidden hover:border-edge-strong transition-colors">
      {/* Collapsed header. A div, not a button — it holds the offer link and
          the quick-action buttons, which can't legally nest inside one. */}
      <div
        className="w-full p-4 cursor-pointer select-none"
        onClick={() => expanded ? cancelEdit() : startEdit()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <IssuerLogo name={account.bankName} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink text-sm">{account.bankName}</span>
                {account.last4 && <span className="text-ink-tertiary text-xs">···{account.last4}</span>}
                {account.accountType && <span className="text-ink-tertiary text-xs">{account.accountType}</span>}
                {account.offerUrl && (
                  <a
                    href={account.offerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-xs text-accent-ink hover:text-accent-ink"
                  >
                    Offer <ExternalLink size={9} />
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <PlayerBadge memberId={account.memberId} members={members} />
                <StatusBadge status={account.status} />
                {account.isTaxable && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning-ink border border-warning/30">
                    1099-INT
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-ink-tertiary flex-shrink-0">{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
        </div>

        <div className="mt-2 space-y-1 text-xs text-ink-muted">
          {account.bonusAmount != null && (
            <div className="flex justify-between">
              <span>Bonus</span>
              <span className="text-ink font-medium">{fmt$(account.bonusAmount)}</span>
            </div>
          )}
          {ddInfo && (
            <div className={`flex justify-between font-medium ${ddInfo.overdue ? 'text-danger-ink' : ddInfo.daysLeft <= 14 ? 'text-warning-ink' : 'text-ink-muted'}`}>
              <span>Direct deposit deadline</span>
              <span>{ddInfo.overdue ? `OVERDUE ${Math.abs(ddInfo.daysLeft)}d ago` : `${ddInfo.daysLeft}d left`}</span>
            </div>
          )}
          {(account.requiredDDCount ?? 1) > 1 && (
            <div className="flex justify-between">
              <span>Direct deposits</span>
              <span className={(account.ddsMade ?? 0) >= account.requiredDDCount ? 'text-success-ink' : 'text-warning-ink'}>
                {account.ddsMade ?? 0}/{account.requiredDDCount} done
              </span>
            </div>
          )}
          {(account.minimumBalance ?? 0) > 0 && !account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Min balance</span>
              <span>{fmt$(account.minimumBalance)}</span>
            </div>
          )}
          {account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Bonus received</span>
              <span className="text-success-ink">{fmtDate(account.bonusReceivedDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-1 pt-1 border-t border-edge">
            <Shield size={11} className={shield.safe ? 'text-success-ink' : 'text-warning-ink'} />
            <span className={shield.safe ? 'text-success-ink' : 'text-warning-ink'}>{shield.message}</span>
          </div>
        </div>
      </div>

      {/* Quick action buttons — the next step in the bonus lifecycle, one tap,
          undoable. Only while collapsed, so they can't fight the edit form. */}
      {!expanded && (quickActions.length > 0 || undoSnapshot) && (
        <div className="px-4 pb-3 pt-0 flex gap-2 flex-wrap items-center border-t border-edge">
          <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center">
            {quickActions.length > 0 && (
              <span className="text-[10px] text-ink-faint uppercase tracking-wider font-medium flex-shrink-0">Mark as</span>
            )}
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
          </div>
          {undoSnapshot && (
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

      {/* Expanded edit form */}
      {expanded && draft && (
        <div className="border-t border-edge-strong p-4 space-y-3">

          {/* Core */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Person</label>
              <select className={inp} value={draft.memberId ?? ''} onChange={e => set('memberId', e.target.value)}>
                {(members ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Status</label>
              <select className={inp} value={draft.status ?? 'Opened'} onChange={e => set('status', e.target.value)}>
                {ACCOUNT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-accent-ink block mb-1 font-medium">Bank Name <span className="text-accent-ink">*required</span></label>
            <input className={inpRequired} value={draft.bankName ?? ''} onChange={e => set('bankName', e.target.value)} placeholder="e.g. Chase, Wells Fargo" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Account Type</label>
              <select className={inp} value={draft.accountType ?? 'Checking'} onChange={e => set('accountType', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Last 4</label>
              <input className={inp} value={draft.last4 ?? ''} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Opened Date</label>
              <DateField value={draft.openedDate} onChange={v => set('openedDate', v)} />
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Current Balance ($)</label>
              <input type="number" min="0" className={inp} value={draft.currentBalance ?? ''} onChange={e => set('currentBalance', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Sign-Up Bonus — shown for active bonus statuses or when bonus data exists */}
          {showBonusSection && (
            <div className="bg-raised/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-ink-secondary mb-2">Sign-Up Bonus</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus Amount ($)</label>
                  <input type="number" min="0" className={inp} value={draft.bonusAmount ?? ''} onChange={e => set('bonusAmount', e.target.value)} placeholder="300" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus Deadline (days)</label>
                  <input type="number" min="1" className={inp} value={draft.bonusDeadlineDays ?? ''} onChange={e => set('bonusDeadlineDays', e.target.value)} placeholder="120" />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Early-Termination Fee Window (days)</label>
                <input type="number" min="1" className={inp} value={draft.etfDays ?? ''} onChange={e => set('etfDays', e.target.value)} placeholder="e.g. 180 — closing before this may cost a fee" />
              </div>
              {showMinBalance && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Minimum Balance ($)</label>
                  <input type="number" min="0" className={inp} value={draft.minimumBalance ?? ''} onChange={e => set('minimumBalance', e.target.value)} placeholder="0" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                <input type="checkbox" checked={!!draft.isTaxable} onChange={e => set('isTaxable', e.target.checked)} />
                Bank bonus is taxable (1099-INT)
              </label>
              {showBonusReceivedDate && (
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Bonus Received Date</label>
                  <DateField value={draft.bonusReceivedDate} onChange={v => set('bonusReceivedDate', v)} />
                </div>
              )}
            </div>
          )}

          {/* Direct Deposit — shown when DD is required or already linked */}
          {showDDSection && (
            <div className="bg-raised/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-ink-secondary mb-2">Direct Deposit Requirements</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Direct Deposit Amount ($)</label>
                  <input type="number" min="0" className={inp} value={draft.requiredDD ?? ''} onChange={e => set('requiredDD', e.target.value)} placeholder="500" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1"># Required</label>
                  <input type="number" min="1" className={inp} value={draft.requiredDDCount ?? ''} onChange={e => set('requiredDDCount', e.target.value)} placeholder="1" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1"># Completed</label>
                  <input type="number" min="0" className={inp} value={draft.ddsMade ?? ''} onChange={e => set('ddsMade', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Direct Deposit Deadline (days from open)</label>
                  <input type="number" min="1" className={inp} value={draft.ddDeadlineDays ?? ''} onChange={e => set('ddDeadlineDays', e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label className="text-xs text-ink-muted block mb-1">Direct Deposit Linked Date</label>
                  <DateField value={draft.ddLinkedDate} onChange={v => set('ddLinkedDate', v)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">Direct Deposit Source</label>
                <input className={inp} value={draft.ddSourceDescription ?? ''} onChange={e => set('ddSourceDescription', e.target.value)} placeholder="e.g. Payroll, Social Security, ACH" />
              </div>
            </div>
          )}

          {/* Offer & Notes */}
          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Offer Link</label>
            <input className={inp} value={draft.offerUrl ?? ''} onChange={e => set('offerUrl', e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label className="text-xs text-ink-muted block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="e.g. Offer terms, DD requirements, expiry" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-ink-tertiary hover:text-danger-ink transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.bankName?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
