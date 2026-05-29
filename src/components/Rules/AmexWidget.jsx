import { useChurn } from '../../store/ChurnContext'
import { getAmexStatus } from '../../engines/amex'
import { fmtDate } from '../../utils/format'

export default function AmexWidget() {
  const { state } = useChurn()
  const players = (state.players ?? []).filter(p => p.role === 'churner')

  if (players.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Amex Rules</h3>
      <p className="text-xs text-zinc-400 mb-4">1 card per 5 days · 2 cards per 90 days · Lifetime language on many products</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map(player => {
          const r = getAmexStatus(player.id, state.creditCards)
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
                  <span className="text-zinc-400">5-day rule</span>
                  <span className={r.blocked5d ? 'text-red-400' : 'text-emerald-400'}>
                    {r.last5days.length}/1 in last 5d
                    {r.nextEligible5d && <span className="text-zinc-500 ml-1">· eligible {fmtDate(r.nextEligible5d)}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">90-day rule</span>
                  <span className={r.blocked90d ? 'text-red-400' : 'text-emerald-400'}>
                    {r.last90days.length}/2 in last 90d
                    {r.nextEligible90d && <span className="text-zinc-500 ml-1">· eligible {fmtDate(r.nextEligible90d)}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Amex cards</span>
                  <span className="text-zinc-300">{r.totalAmexCards}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Lifetime language: check individual card T&amp;Cs — bonus may not repeat.</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
