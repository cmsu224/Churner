import { getSpendDeadlineInfo } from '../../engines/lifecycle'
import { fmt$ } from '../../utils/format'
import PlayerBadge from '../shared/PlayerBadge'

export default function SpendProgress({ card }) {
  const info = getSpendDeadlineInfo(card)
  if (!info) return null

  const urgency =
    !info.met && info.daysLeft < 14
      ? 'border-danger/30 bg-danger/5'
      : !info.met && info.daysLeft < 30
      ? 'border-warning/30 bg-warning/5'
      : 'border-edge-strong bg-raised/50'

  const barColor = info.met
    ? 'bg-success'
    : info.daysLeft < 14
    ? 'bg-danger'
    : info.daysLeft < 30
    ? 'bg-warning'
    : 'bg-info'

  return (
    <div className={`rounded-lg border p-3 ${urgency}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-medium text-ink leading-tight">{card.cardName}</div>
          <div className="text-xs text-ink-muted">{card.issuer} ···{card.last4}</div>
        </div>
        <PlayerBadge memberId={card.memberId} showName={false} />
      </div>
      <div className="h-1.5 bg-overlay rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${info.pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-secondary">
          {fmt$(card.currentSpend ?? 0)} of {fmt$(card.spendRequirement ?? 0)}
        </span>
        {info.met ? (
          <span className="text-success-ink font-medium">Bonus Met ✓</span>
        ) : (
          <span className={info.daysLeft < 14 ? 'text-danger-ink font-medium' : 'text-ink-muted'}>
            {info.daysLeft}d left
          </span>
        )}
      </div>
    </div>
  )
}
