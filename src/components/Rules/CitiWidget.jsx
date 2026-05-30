import { useChurn } from '../../store/ChurnContext'
import { getCitiStatus } from '../../engines/citi'
import { fmtDate } from '../../utils/format'

export default function CitiWidget() {
  const { state } = useChurn()
  const players = (state.members ?? []).filter(p => p.role === 'churner')

  if (players.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Citi Rules</h3>
      <p className="text-xs text-zinc-400 mb-4">1 card per 8 days · 2 cards per 65 days</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map(player => {
          const r = getCitiStatus(player.id, state.creditCards)
          return (
            <div key={player.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                <span className="text-sm font-medium text-white">{player.name}</span>
                <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                  r.blocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {r.blocked ? 'Blocked' : 'Eligible'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">8-day rule</span>
                  <span className={r.blocked8d ? 'text-red-400' : 'text-emerald-400'}>
                    {r.last8days.length}/1 in last 8d
                    {r.nextEligible8d && <span className="text-zinc-500 ml-1">· eligible {fmtDate(r.nextEligible8d)}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">65-day rule</span>
                  <span className={r.blocked65d ? 'text-red-400' : 'text-emerald-400'}>
                    {r.last65days.length}/2 in last 65d
                    {r.nextEligible65d && <span className="text-zinc-500 ml-1">· eligible {fmtDate(r.nextEligible65d)}</span>}
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
