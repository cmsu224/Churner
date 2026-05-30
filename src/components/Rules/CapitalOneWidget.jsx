import { useChurn } from '../../store/ChurnContext'
import { getCapitalOneStatus } from '../../engines/capitalone'
import { fmtDate } from '../../utils/format'

export default function CapitalOneWidget() {
  const { state } = useChurn()
  const players = (state.members ?? []).filter(p => p.role === 'churner')

  if (players.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Capital One Rules</h3>
      <p className="text-xs text-zinc-400 mb-4">1 personal card per 6 months</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map(player => {
          const r = getCapitalOneStatus(player.id, state.creditCards)
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
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cards in last 6 months</span>
                  <span className={r.blocked ? 'text-red-400' : 'text-emerald-400'}>{r.last6mo.length}/1</span>
                </div>
                {r.nextEligible && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Eligible again</span>
                    <span className="text-amber-400">{fmtDate(r.nextEligible)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Capital One cards</span>
                  <span className="text-zinc-300">{r.totalCards}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
