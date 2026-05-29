import { useChurn } from '../../store/ChurnContext'
import { generateActionItems } from '../../engines/actionItems'
import ActionQueue from './ActionQueue'
import PlayerSummaryCard from './PlayerSummaryCard'
import SpendProgress from './SpendProgress'
import { fmt$ } from '../../utils/format'
import { CheckCircle } from 'lucide-react'

export default function DashboardView() {
  const { state } = useChurn()
  const items = generateActionItems(state)

  const activeCards = (state.creditCards ?? []).filter(c => c.status !== 'Closed')
  const activeAccounts = (state.bankAccounts ?? []).filter(a => a.status !== 'Closed')

  // Cash pipeline = unreceived cash bonuses only (points can't easily be summed)
  const cashPipeline =
    (state.creditCards ?? [])
      .filter(c => !c.bonusReceived && c.bonusType === 'cashback' && (c.bonusValue ?? 0) > 0)
      .reduce((s, c) => s + (c.bonusValue ?? 0), 0) +
    (state.bankAccounts ?? [])
      .filter(a => !a.bonusReceivedDate && (a.bonusAmount ?? 0) > 0)
      .reduce((s, a) => s + (a.bonusAmount ?? 0), 0)

  const pendingSpend = (state.creditCards ?? []).filter(c => {
    if (c.status === 'Closed') return false
    return (c.spendRequirement ?? 0) > 0 && (c.currentSpend ?? 0) < (c.spendRequirement ?? 0)
  })

  const isEmpty = (state.creditCards ?? []).length === 0 && (state.bankAccounts ?? []).length === 0

  if (isEmpty) {
    return (
      <div className="p-4 max-w-5xl mx-auto text-center py-20 text-zinc-500">
        <div className="text-5xl mb-4">🏦</div>
        <div className="text-base font-medium text-zinc-400 mb-1">Nothing tracked yet</div>
        <div className="text-sm">Add cards under Cards, add bank accounts under Accounts, or use Import to load data in bulk.</div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">Cash Pipeline</div>
          <div className="text-lg font-bold text-emerald-400">{fmt$(cashPipeline)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">Active Cards</div>
          <div className="text-lg font-bold text-white">{activeCards.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-center">
          <div className="text-xs text-zinc-500 mb-1">Bank Accounts</div>
          <div className="text-lg font-bold text-white">{activeAccounts.length}</div>
        </div>
      </div>

      {/* Action Queue */}
      {items.length > 0 ? (
        <ActionQueue items={items} state={state} />
      ) : (
        <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">You're all caught up</div>
            <div className="text-xs text-zinc-400 mt-0.5">No urgent actions. Keep tracking spend and watching for annual fees.</div>
          </div>
        </div>
      )}

      {/* Active Spend Challenges */}
      {pendingSpend.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Active Spend Challenges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingSpend.map(card => <SpendProgress key={card.id} card={card} />)}
          </div>
        </section>
      )}

      {/* Player Summary */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Player Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(state.players ?? []).map(player => (
            <PlayerSummaryCard key={player.id} player={player} />
          ))}
        </div>
      </section>
    </div>
  )
}
