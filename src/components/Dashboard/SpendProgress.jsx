import { useNavigate } from 'react-router-dom'
import { getSpendProgress } from '../../engines/lifecycle'
import { getBurnRate } from '../../engines/burnRate'
import { fmt$ } from '../../utils/format'
import PlayerBadge from '../shared/PlayerBadge'

// One card's minimum-spend challenge. Renders even when the deadline can't be
// computed yet (no open date / spend-window days) — the bar shouldn't vanish
// just because a date is missing. Clicking drills into the card on Cards.
export default function SpendProgress({ card }) {
  const navigate = useNavigate()
  const spend = getSpendProgress(card)
  const burn = getBurnRate(card)
  if (!spend) return null
  const info = spend.deadline

  const urgency =
    info && !spend.met && info.daysLeft < 14
      ? 'border-danger/30 bg-danger/5'
      : info && !spend.met && info.daysLeft < 30
      ? 'border-warning/30 bg-warning/5'
      : 'border-edge-strong bg-raised/50'

  const barColor = spend.met
    ? 'bg-success'
    : !info
    ? 'bg-info'
    : info.daysLeft < 14
    ? 'bg-danger'
    : info.daysLeft < 30
    ? 'bg-warning'
    : 'bg-info'

  return (
    <button
      onClick={() => navigate(`/cards?highlight=${card.id}`)}
      className={`w-full text-left rounded-lg border p-3 hover:border-accent/50 transition-colors ${urgency}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-medium text-ink leading-tight">{card.cardName}</div>
          <div className="text-xs text-ink-muted">{card.issuer} ···{card.last4}</div>
        </div>
        <PlayerBadge memberId={card.memberId} showName={false} />
      </div>
      <div className="h-1.5 bg-overlay rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${spend.pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-secondary">
          {fmt$(spend.spent)} of {fmt$(spend.requirement)}
        </span>
        {spend.met ? (
          <span className="text-success-ink font-medium">Bonus Met ✓</span>
        ) : info ? (
          <span className={info.daysLeft < 14 ? 'text-danger-ink font-medium' : 'text-ink-muted'}>
            {info.daysLeft}d left
          </span>
        ) : (
          <span className="text-ink-faint">no deadline set</span>
        )}
      </div>
      {burn && (
        <div className={`text-[11px] mt-1.5 ${burn.onTrack ? 'text-success-ink' : 'text-warning-ink'}`}>
          {burn.overdue
            ? 'Past deadline — call the issuer about an extension'
            : burn.onTrack && burn.projectedDate
            ? `On pace — projected done ${new Date(burn.projectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : burn.stalled
            ? `No recent spend — need ${fmt$(burn.neededPerWeek)}/wk`
            : `Off pace — need ${fmt$(burn.neededPerWeek)}/wk (current ~${fmt$(burn.perWeek)}/wk)`}
        </div>
      )}
    </button>
  )
}
