import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import BalanceBar from '../shared/BalanceBar'
import DateField from '../shared/DateField'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountNextStatus } from '../../engines/lifecycle'
import { ACCOUNT_STATUSES } from '../../utils/statusMeta'
import { fmt$, fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2, Shield, ExternalLink } from 'lucide-react'

const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

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
        currentBalance: draft.currentBalance !== '' && draft.currentBalance != null ? parseFloat(draft.currentBalance) || 0 : 0,
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
      <div className="bg-surface border border-danger/30 rounded-xl p-4">
        <p className="text-sm text-ink-secondary mb-3">Delete <strong className="text-ink">{account.bankName}</strong>?</p>
        <div className="flex gap-2">
          <button onClick={() => setConfirming(false)} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} className="flex-1 bg-danger hover:bg-danger/85 text-ink py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
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
    <div className="bg-surface border border-edge-strong rounded-xl overflow-hidden hover:border-edge-strong transition-colors">
      {/* Collapsed header */}
      <button
        className="w-full text-left p-4"
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

        <BalanceBar balance={account.currentBalance ?? 0} kind="account" />

        {nextStatus && !expanded && (
          <div className="mt-1.5 text-xs text-warning-ink">→ Suggest: {nextStatus}</div>
        )}
      </button>

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
            <button onClick={saveEdit} disabled={!draft.bankName?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-ink font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
