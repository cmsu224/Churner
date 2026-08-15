import { fmtDate } from '../../utils/format'
import { RefreshCw, CheckCircle, Ban, HelpCircle } from 'lucide-react'

// The reapply clock readout for a closed bank account: how the account's own
// history (opened → closed) lines up against the bank's cooldown, and the date
// it pays a new-account bonus again. Shared by the account card and the
// Reapply Eligibility tracker so both read identically.
const TONE = {
  eligible: { text: 'text-success-ink',  bar: 'bg-success',      Icon: CheckCircle },
  cooling:  { text: 'text-ink-secondary', bar: 'bg-accent',      Icon: RefreshCw },
  lifetime: { text: 'text-ink-tertiary', bar: 'bg-ink-tertiary', Icon: Ban },
  unknown:  { text: 'text-ink-tertiary', bar: 'bg-overlay',      Icon: HelpCircle },
}

function rightLabel(reapply) {
  switch (reapply.state) {
    case 'eligible': return 'Eligible now'
    case 'cooling':  return `${reapply.daysUntil}d · ${fmtDate(reapply.eligibleDate)}`
    case 'lifetime': return 'Once per lifetime'
    default:         return 'Add an opened date'
  }
}

export default function ReapplyClock({ reapply, openedDate, className = '' }) {
  if (!reapply) return null
  const tone = TONE[reapply.state] ?? TONE.unknown
  const { Icon } = tone
  const showBar = reapply.state === 'cooling' || reapply.state === 'eligible'

  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      <div className="flex justify-between gap-2">
        <span className="text-ink-muted">Opened → closed</span>
        <span className="text-ink-secondary">
          {fmtDate(openedDate ?? reapply.openedDate)} → {fmtDate(reapply.closedDate)}
        </span>
      </div>

      {showBar && (
        <div className="h-1.5 bg-overlay rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(2, reapply.pct)}%` }} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-ink-muted">
          <Icon size={11} className={`flex-shrink-0 ${tone.text}`} />
          Reapply for bonus
        </span>
        <span className={`font-medium flex-shrink-0 ${tone.text}`}>{rightLabel(reapply)}</span>
      </div>

      <div className="text-ink-faint">
        {reapply.lifetime ? 'lifetime rule' : `~${reapply.months}mo rule`}
        {reapply.anchor && ` · from ${reapply.anchorFromBonus ? 'bonus' : 'opening'} ${fmtDate(reapply.anchor)}`}
      </div>

      {reapply.bankStillOpen && (
        <div className="text-warning-ink">
          Another {reapply.bankName} account is still open — new-bonus offers usually exclude current customers.
        </div>
      )}
    </div>
  )
}
