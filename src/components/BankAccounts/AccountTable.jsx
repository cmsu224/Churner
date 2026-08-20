import TrackerTable, { Milestone, Blank } from '../shared/TrackerTable'
import IssuerLogo from '../shared/IssuerLogo'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountReeligibility } from '../../engines/bankReeligibility'
import { fmt$0, fmtDateTracker } from '../../utils/format'
import { statusLabel } from '../../utils/statusMeta'

// The bonus requirement in one cell, rebuilt from the structured fields the
// account already carries — direct deposits, how many, the balance floor, and
// the window they have to land in.
function requirementLabel(a) {
  const parts = []
  const count = Number(a.requiredDDCount) || 0
  if (Number(a.requiredDD) > 0) {
    parts.push(`${fmt$0(a.requiredDD)} DD${count > 1 ? ` ×${count}` : ''}`)
  } else if (count > 0) {
    parts.push(`${count} DD${count > 1 ? 's' : ''}`)
  }
  if (Number(a.minimumBalance) > 0) parts.push(`${fmt$0(a.minimumBalance)} bal`)
  if (Number(a.ddDeadlineDays) > 0) parts.push(`${a.ddDeadlineDays}d`)
  return parts.join(' · ')
}

// Direct deposits: a fraction while several are required (the same count the
// card's +DD button increments), otherwise the date the first one linked.
function DirectDeposits({ account }) {
  const need = Number(account.requiredDDCount) || 0
  const made = Number(account.ddsMade) || 0
  if (need > 1) {
    return (
      <span className={made >= need ? 'text-success-ink' : 'text-ink-secondary'}>
        {made}/{need}
      </span>
    )
  }
  return <Milestone date={account.ddLinkedDate} done={made > 0} />
}

// The reapply clock, which only runs once the account is closed.
function Reapply({ account, accounts }) {
  const r = getAccountReeligibility(account, accounts)
  if (!r) return <Blank />
  if (r.state === 'lifetime') return <span className="text-ink-tertiary whitespace-nowrap">Lifetime</span>
  if (r.state === 'unknown') return <Blank />
  if (r.state === 'eligible') {
    return (
      <span className={`whitespace-nowrap ${r.bankStillOpen ? 'text-warning-ink' : 'text-success-ink'}`}>
        {r.bankStillOpen ? 'Close others' : 'Now'}
      </span>
    )
  }
  return <span className="text-ink-secondary whitespace-nowrap">{fmtDateTracker(r.eligibleDate)}</span>
}

// Clawback shield — the "close after" date every open account is waiting on.
function CloseAfter({ account }) {
  const shield = getClawbackStatus(account)
  if (!shield?.safeDate) return <Blank />
  if (shield.safe) return <Milestone date={shield.safeDate} />
  return <span className="text-ink-secondary whitespace-nowrap">{fmtDateTracker(shield.safeDate)}</span>
}

export default function AccountTable({ accounts, allAccounts, members, onRowClick }) {
  const columns = [
    {
      key: 'bank',
      label: 'Bank',
      render: a => {
        const member = members.find(m => m.id === a.memberId)
        return (
          <div className="flex items-center gap-2 min-w-0">
            {member && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: member.hex }} title={member.name} />}
            <IssuerLogo name={a.bankName} size={18} />
            <span className="text-ink font-medium whitespace-nowrap">{a.bankName || 'Unnamed'}</span>
            {a.last4 && <span className="text-ink-faint">···{a.last4}</span>}
          </div>
        )
      },
    },
    { key: 'member', label: 'Person', render: a => <span className="text-ink-muted whitespace-nowrap">{members.find(m => m.id === a.memberId)?.name ?? '—'}</span> },
    { key: 'type', label: 'Type', render: a => <span className="text-ink-muted whitespace-nowrap">{a.accountType || '—'}</span> },
    { key: 'status', label: 'Status', render: a => <span className="text-ink-muted whitespace-nowrap">{statusLabel(a.status)}</span> },
    { key: 'opened', label: 'Opened', render: a => a.openedDate ? <span className="text-ink-secondary whitespace-nowrap">{fmtDateTracker(a.openedDate)}</span> : <Blank /> },
    { key: 'bonus', label: 'Bonus', align: 'right', render: a => Number(a.bonusAmount) > 0 ? <span className="text-ink font-medium">{fmt$0(a.bonusAmount)}</span> : <Blank /> },
    { key: 'req', label: 'Requirement', render: a => { const r = requirementLabel(a); return r ? <span className="text-ink-muted whitespace-nowrap">{r}</span> : <Blank /> } },
    { key: 'dd', label: 'DD', render: a => <DirectDeposits account={a} /> },
    { key: 'posted', label: 'Posted', render: a => <Milestone date={a.bonusReceivedDate} done={a.status === 'Bonus Received'} /> },
    { key: 'closeafter', label: 'Close after', render: a => <CloseAfter account={a} /> },
    { key: 'closed', label: 'Closed', render: a => <Milestone date={a.closedDate} done={a.status === 'Closed'} tone="muted" /> },
    { key: 'reapply', label: 'Reapply', render: a => <Reapply account={a} accounts={allAccounts} /> },
  ]

  return (
    <TrackerTable
      columns={columns}
      rows={accounts}
      getRowKey={a => a.id}
      onRowClick={onRowClick}
      caption="Close after = the 181-day clawback shield. Reapply = when that bank pays a new-account bonus again, per its own rule on the Eligibility page. Tap a row to open the account."
    />
  )
}
