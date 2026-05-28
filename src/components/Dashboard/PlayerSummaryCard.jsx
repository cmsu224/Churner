import { useChurn } from '../../store/ChurnContext'
import { getChase524Status } from '../../engines/chase524'
import { fmt$ } from '../../utils/format'
import { CreditCard, Landmark } from 'lucide-react'

export default function PlayerSummaryCard({ player }) {
  const { state } = useChurn()
  const cards = (state.creditCards ?? []).filter(c => c.playerId === player.id)
  const accounts = (state.bankAccounts ?? []).filter(a => a.playerId === player.id)
  const activeCards = cards.filter(c => c.status !== 'Closed')
  const cardPipeline = cards
    .filter(c => !c.bonusReceived && (c.bonusValue ?? 0) > 0)
    .reduce((s, c) => s + (c.bonusValue ?? 0), 0)
  const bankPipeline = accounts
    .filter(a => !a.bonusReceivedDate && (a.bonusAmount ?? 0) > 0)
    .reduce((s, a) => s + (a.bonusAmount ?? 0), 0)
  const s524 = player.role === 'churner' ? getChase524Status(player.id, state.creditCards) : null

  const statusColor =
    s524?.status === 'blocked'
      ? 'text-red-400'
      : s524?.status === 'warning'
      ? 'text-amber-400'
      : 'text-emerald-400'

  const barColor =
    s524?.status === 'blocked' ? 'bg-red-500' : s524?.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div
      className="bg-zinc-900 border rounded-xl p-4 flex flex-col gap-3"
      style={{ borderColor: player.hex + '40' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: player.hex }} />
          <span className="font-semibold text-white">{player.name}</span>
          <span className="text-xs text-zinc-500 capitalize">{player.role}</span>
        </div>
        {s524 && (
          <span className={`text-xs font-semibold ${statusColor}`}>{s524.count}/5 slots</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-zinc-800 rounded-lg p-2.5 flex items-center gap-2">
          <CreditCard size={14} className="text-zinc-400" />
          <div>
            <div className="text-zinc-400 text-xs">Active Cards</div>
            <div className="text-white font-semibold">{activeCards.length}</div>
          </div>
        </div>
        <div className="bg-zinc-800 rounded-lg p-2.5 flex items-center gap-2">
          <Landmark size={14} className="text-zinc-400" />
          <div>
            <div className="text-zinc-400 text-xs">Accounts</div>
            <div className="text-white font-semibold">{accounts.length}</div>
          </div>
        </div>
      </div>

      {(cardPipeline + bankPipeline) > 0 && (
        <div className="bg-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Bonus Pipeline</span>
          <span className="text-sm font-semibold text-emerald-400">{fmt$(cardPipeline + bankPipeline)}</span>
        </div>
      )}

      {s524 && (
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Chase 5/24</span>
            <span className={statusColor}>{s524.slotsRemaining} slot{s524.slotsRemaining !== 1 ? 's' : ''} remaining</span>
          </div>
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.min(100, (s524.count / 5) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
