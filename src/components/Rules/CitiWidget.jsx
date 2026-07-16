import { useChurn } from '../../store/ChurnContext'
import { getCitiStatus } from '../../engines/citi'
import { fmtDate } from '../../utils/format'

export default function CitiWidget() {
  const { state } = useChurn()
  const players = (state.members ?? []).filter(p => p.role === 'churner')

  if (players.length === 0) return null

  return (
    <div className="bg-surface border border-edge-strong rounded-xl p-5">
      <h3 className="text-base font-semibold text-ink mb-1">Citi Rules</h3>
      <p className="text-xs text-ink-muted mb-4">1 card per 8 days · 2 cards per 65 days</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map(player => {
          const r = getCitiStatus(player.id, state.creditCards)
          return (
            <div key={player.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                <span className="text-sm font-medium text-ink">{player.name}</span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.blocked ? 'bg-danger/20 text-danger-ink' : 'bg-success/20 text-success-ink'
                }`}>
                  {r.blocked ? 'Blocked' : 'Eligible'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">8-day rule</span>
                  <span className={r.blocked8d ? 'text-danger-ink' : 'text-success-ink'}>
                    {r.last8days.length}/1 in last 8d
                    {r.nextEligible8d && <span className="text-ink-tertiary ml-1">· eligible {fmtDate(r.nextEligible8d)}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-muted">65-day rule</span>
                  <span className={r.blocked65d ? 'text-danger-ink' : 'text-success-ink'}>
                    {r.last65days.length}/2 in last 65d
                    {r.nextEligible65d && <span className="text-ink-tertiary ml-1">· eligible {fmtDate(r.nextEligible65d)}</span>}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
