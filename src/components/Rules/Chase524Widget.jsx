import { useChurn } from '../../store/ChurnContext'
import { getChase524Status } from '../../engines/chase524'
import { fmtDate } from '../../utils/format'

export default function Chase524Widget() {
  const { state } = useChurn()
  const churners = (state.members ?? []).filter(p => p.role === 'churner')

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Chase 5/24 Tracker</h3>
      <p className="text-xs text-zinc-400 mb-4">
        Personal cards opened in the last 24 months, across all issuers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {churners.map(player => {
          const result = getChase524Status(player.id, state.creditCards)
          const statusColor =
            result.status === 'blocked'
              ? 'text-red-400'
              : result.status === 'warning'
              ? 'text-amber-400'
              : 'text-emerald-400'
          const barColor =
            result.status === 'blocked' ? 'bg-red-500' : result.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
          const label =
            result.status === 'blocked' ? 'BLOCKED' : result.status === 'warning' ? 'Warning' : 'Eligible'

          return (
            <div key={player.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                  <span className="text-sm font-medium text-white">{player.name}</span>
                </div>
                <span className={`text-sm font-bold ${statusColor}`}>
                  {result.count}/5 — {label}
                </span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden mb-3">
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
                      <div key={card.id} className="flex justify-between text-xs text-zinc-400">
                        <span>{card.cardName} ({card.issuer})</span>
                        <span className={daysLeft < 60 ? 'text-emerald-400 font-medium' : ''}>
                          {daysLeft < 60 ? `drops in ${daysLeft}d` : fmtDate(exp.toISOString())}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-500">No personal cards in 24-month window.</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
