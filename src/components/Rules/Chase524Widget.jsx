import { useChurn } from '../../store/ChurnContext'
import { getChase524Status } from '../../engines/chase524'
import { fmtDate } from '../../utils/format'

export default function Chase524Widget() {
  const { state } = useChurn()
  const churners = (state.members ?? []).filter(p => p.role === 'churner')

  return (
    <div className="bg-surface border border-edge-strong rounded-xl p-5">
      <h3 className="text-base font-semibold text-ink mb-1">Chase 5/24 Tracker</h3>
      <p className="text-xs text-ink-muted mb-4">
        Personal cards opened in the last 24 months, across all issuers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {churners.map(player => {
          const result = getChase524Status(player.id, state.creditCards)
          const statusColor =
            result.status === 'blocked'
              ? 'text-danger-ink'
              : result.status === 'warning'
              ? 'text-warning-ink'
              : 'text-success-ink'
          const barColor =
            result.status === 'blocked' ? 'bg-danger' : result.status === 'warning' ? 'bg-warning' : 'bg-success'
          const label =
            result.status === 'blocked' ? 'BLOCKED' : result.status === 'warning' ? 'Warning' : 'Eligible'

          return (
            <div key={player.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                  <span className="text-sm font-medium text-ink">{player.name}</span>
                </div>
                <span className={`text-sm font-bold ${statusColor}`}>
                  {result.count}/5 — {label}
                </span>
              </div>
              <div className="h-2 bg-overlay rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, (result.count / 5) * 100)}%` }}
                />
              </div>
              {result.cards.length > 0 ? (
                <div className="space-y-1">
                  {result.cards.map(card => {
                    const exp = new Date(card.openDate)
                    exp.setMonth(exp.getMonth() + 24)
                    const daysLeft = Math.ceil((exp - new Date()) / 86400000)
                    return (
                      <div key={card.id} className="flex justify-between text-xs text-ink-muted">
                        <span>{card.cardName} ({card.issuer})</span>
                        <span className={daysLeft < 60 ? 'text-success-ink font-medium' : ''}>
                          {daysLeft < 60 ? `drops in ${daysLeft}d` : fmtDate(exp.toISOString())}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-ink-tertiary">No personal cards in 24-month window.</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
