import { getSpendDeadlineInfo } from '../../engines/lifecycle'
import { fmt$ } from '../../utils/format'
import PlayerBadge from '../shared/PlayerBadge'

export default function SpendProgress({ card }) {
  const info = getSpendDeadlineInfo(card)
  if (!info) return null

  const urgency =
    !info.met && info.daysLeft < 14
      ? 'border-red-500/30 bg-red-500/5'
      : !info.met && info.daysLeft < 30
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-zinc-700 bg-zinc-800/50'

  const barColor = info.met
    ? 'bg-emerald-500'
    : info.daysLeft < 14
    ? 'bg-red-500'
    : info.daysLeft < 30
    ? 'bg-amber-500'
    : 'bg-blue-500'

  return (
    <div className={`rounded-lg border p-3 ${urgency}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="text-sm font-medium text-white leading-tight">{card.cardName}</div>
          <div className="text-xs text-zinc-400">{card.issuer} ···{card.last4}</div>
        </div>
        <PlayerBadge memberId={card.memberId} showName={false} />
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${info.pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-300">
          {fmt$(card.currentSpend ?? 0)} of {fmt$(card.spendRequirement ?? 0)}
        </span>
        {info.met ? (
          <span className="text-emerald-400 font-medium">Bonus Met ✓</span>
        ) : (
          <span className={info.daysLeft < 14 ? 'text-red-400 font-medium' : 'text-zinc-400'}>
            {info.daysLeft}d left
          </span>
        )}
      </div>
    </div>
  )
}
