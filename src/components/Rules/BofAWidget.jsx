import { useChurn } from '../../store/ChurnContext'
import { getBofAStatus } from '../../engines/bofa'

export default function BofAWidget() {
  const { state } = useChurn()
  const players = (state.members ?? []).filter(p => p.role === 'churner')

  if (players.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Bank of America 2/3/4 Rule</h3>
      <p className="text-xs text-zinc-400 mb-4">Max 2 BofA cards in 2 months · 3 in 12 months · 4 in 24 months</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {players.map(player => {
          const r = getBofAStatus(player.id, state.creditCards)
          const rules = [
            { label: '2-month', data: r.rule_2mo },
            { label: '12-month', data: r.rule_12mo },
            { label: '24-month', data: r.rule_24mo },
          ]
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
                {rules.map(({ label, data }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-zinc-400">{label}</span>
                      <span className={data.ok ? 'text-emerald-400' : 'text-red-400'}>
                        {data.count}/{data.max}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${data.ok ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, (data.count / data.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
