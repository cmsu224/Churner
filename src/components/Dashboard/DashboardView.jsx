import { useChurn } from '../../store/ChurnContext'
import AlertBanner from './AlertBanner'
import PlayerSummaryCard from './PlayerSummaryCard'
import SpendProgress from './SpendProgress'

export default function DashboardView() {
  const { state } = useChurn()
  const activeSpend = (state.creditCards ?? []).filter(c => {
    if (c.status === 'Closed') return false
    return (c.spendRequirement ?? 0) > 0 && (c.currentSpend ?? 0) < (c.spendRequirement ?? 0)
  })

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <AlertBanner />
      <h1 className="text-xl font-bold text-white mb-4">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {(state.players ?? []).map(player => (
          <PlayerSummaryCard key={player.id} player={player} />
        ))}
      </div>

      {activeSpend.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-white mb-3">Active Spend Challenges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {activeSpend.map(card => (
              <SpendProgress key={card.id} card={card} />
            ))}
          </div>
        </>
      )}

      {(state.creditCards ?? []).length === 0 && (state.bankAccounts ?? []).length === 0 && (
        <div className="text-center py-16 text-zinc-500">
          <div className="text-4xl mb-3">🏦</div>
          <div className="text-base font-medium text-zinc-400 mb-1">Nothing tracked yet</div>
          <div className="text-sm">Add cards under Cards, or bank accounts under Accounts.</div>
        </div>
      )}
    </div>
  )
}
