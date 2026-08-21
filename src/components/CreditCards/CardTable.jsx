import TrackerTable, { Milestone, Blank } from '../shared/TrackerTable'
import IssuerLogo from '../shared/IssuerLogo'
import { getAnnualFeeInfo, getCardCloseShield, getSpendProgress } from '../../engines/lifecycle'
import { fmt$0, fmtPts, fmtDateTracker } from '../../utils/format'
import { statusLabel } from '../../utils/statusMeta'

function BonusCell({ card }) {
  const value = Number(card.bonusValue) || 0
  if (!(value > 0)) return <Blank />
  if (card.bonusType === 'cashback') return <span className="text-ink font-medium">{fmt$0(value)}</span>
  return (
    <span className="text-ink font-medium whitespace-nowrap">
      {fmtPts(value)} <span className="text-ink-faint font-normal">{card.bonusType === 'miles' ? 'mi' : 'pts'}</span>
    </span>
  )
}

// Minimum spend met so far, colored by whether the requirement is satisfied.
function SpentCell({ card }) {
  const progress = getSpendProgress(card)
  if (!progress) return <Blank />
  return (
    <span className={progress.met ? 'text-success-ink' : 'text-ink-secondary'}>
      {fmt$0(progress.spent)}
      <span className="text-ink-faint"> · {progress.pct}%</span>
    </span>
  )
}

// The spend deadline, or how many days are left on it while it's still live.
function SpendByCell({ card }) {
  const progress = getSpendProgress(card)
  const deadline = progress?.deadline
  if (!deadline) return <Blank />
  if (progress.met) return <span className="text-ink-faint whitespace-nowrap">{fmtDateTracker(deadline.deadline)}</span>
  const tone = deadline.daysLeft < 0 ? 'text-danger-ink' : deadline.daysLeft <= 30 ? 'text-warning-ink' : 'text-ink-secondary'
  return (
    <span className={`${tone} whitespace-nowrap`}>
      {fmtDateTracker(deadline.deadline)}
      <span className="text-ink-faint"> · {deadline.daysLeft < 0 ? 'past' : `${deadline.daysLeft}d`}</span>
    </span>
  )
}

// The next annual fee: its date, and which of the three fee phases it's in.
function FeeDueCell({ card }) {
  const fee = getAnnualFeeInfo(card)
  if (!fee) return <Blank />
  if (fee.inRefundWindow) {
    return (
      <span className="text-danger-ink whitespace-nowrap">
        {fmtDateTracker(fee.feeDate)}
        <span className="text-ink-faint"> · {fee.refundDaysLeft}d refund</span>
      </span>
    )
  }
  if (fee.awaitingPost) {
    return (
      <span className="text-warning-ink whitespace-nowrap">
        {fmtDateTracker(fee.feeDate)}
        <span className="text-ink-faint"> · {fee.overdue ? 'overdue' : 'any day'}</span>
      </span>
    )
  }
  return (
    <span className="text-ink-secondary whitespace-nowrap">
      {fmtDateTracker(fee.feeDate)}
      <span className="text-ink-faint"> · {fee.daysUntilFee}d</span>
    </span>
  )
}

// 12-month close shield — the card equivalent of the bank clawback window.
function CloseAfterCell({ card }) {
  const shield = getCardCloseShield(card)
  if (!shield?.safeDate) return <Blank />
  if (shield.safe) return <Milestone date={shield.safeDate} />
  return <span className="text-ink-secondary whitespace-nowrap">{fmtDateTracker(shield.safeDate)}</span>
}

export default function CardTable({ cards, members, onRowClick }) {
  const columns = [
    {
      key: 'card',
      label: 'Card',
      render: c => {
        const member = members.find(m => m.id === c.memberId)
        return (
          <div className="flex items-center gap-2 min-w-0">
            {member && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: member.hex }} title={member.name} />}
            <IssuerLogo name={c.issuer || c.cardName} size={18} />
            <span className="text-ink font-medium whitespace-nowrap">{c.cardName || 'Unnamed'}</span>
            {c.last4 && <span className="text-ink-faint">···{c.last4}</span>}
          </div>
        )
      },
    },
    { key: 'member', label: 'Person', render: c => <span className="text-ink-muted whitespace-nowrap">{members.find(m => m.id === c.memberId)?.name ?? '—'}</span> },
    { key: 'status', label: 'Status', render: c => <span className="text-ink-muted whitespace-nowrap">{statusLabel(c.status)}</span> },
    { key: 'opened', label: 'Opened', render: c => c.openDate ? <span className="text-ink-secondary whitespace-nowrap">{fmtDateTracker(c.openDate)}</span> : <Blank /> },
    { key: 'bonus', label: 'Bonus', align: 'right', render: c => <BonusCell card={c} /> },
    { key: 'spendreq', label: 'Min spend', align: 'right', render: c => Number(c.spendRequirement) > 0 ? <span className="text-ink-muted">{fmt$0(c.spendRequirement)}</span> : <Blank /> },
    { key: 'spent', label: 'Spent', align: 'right', render: c => <SpentCell card={c} /> },
    { key: 'spendby', label: 'Spend by', render: c => <SpendByCell card={c} /> },
    { key: 'posted', label: 'Bonus posted', render: c => <Milestone date={c.bonusReceivedDate} done={c.bonusReceived || c.status === 'Bonus Met'} /> },
    { key: 'fee', label: 'Fee', align: 'right', render: c => Number(c.annualFee) > 0 ? <span className="text-ink-muted">{fmt$0(c.annualFee)}</span> : <Blank /> },
    { key: 'feedue', label: 'Fee due', render: c => <FeeDueCell card={c} /> },
    { key: 'closeafter', label: 'Close after', render: c => <CloseAfterCell card={c} /> },
    { key: 'closed', label: 'Closed', render: c => <Milestone date={c.closedDate} done={c.status === 'Closed' || c.status === 'Downgraded'} tone="muted" /> },
  ]

  return (
    <TrackerTable
      columns={columns}
      rows={cards}
      getRowKey={c => c.id}
      onRowClick={onRowClick}
      caption="Close after = the 12-month clawback shield, so the bonus is safe once it passes. Fee due carries the fee phase — a countdown, “any day” while it waits on a statement, or the refund clock once you confirm it posted. Tap a row to open the card."
    />
  )
}
