import { useChurn } from '../../store/ChurnContext'
import { getSeniorIncomeReport } from '../../engines/seniorIncome'
import { fmt$ } from '../../utils/format'

export default function SeniorIncomeWidget() {
  const { state, dispatch } = useChurn()
  const seniors = (state.players ?? []).filter(p => p.role === 'senior')
  const report = getSeniorIncomeReport(state.seniorIncome)

  function updateIncome(playerId, field, val) {
    const current = state.seniorIncome?.[playerId] ?? { ssMonthly: 0, accessibleSupport: 0 }
    dispatch({ type: 'UPDATE_SENIOR_INCOME', playerId, payload: { ...current, [field]: parseFloat(val) || 0 } })
  }

  const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'
  const playerReport = { p3: report.mom, p4: report.dad }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Senior Accessible Income</h3>
      <p className="text-xs text-zinc-400 mb-4">
        Use <strong className="text-amber-400">Total Accessible Income</strong> on credit applications — NOT Social Security directly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {seniors.map(player => {
          const income = state.seniorIncome?.[player.id] ?? { ssMonthly: 0, accessibleSupport: 0 }
          const rpt = playerReport[player.id] ?? { annualSS: 0, annualSupport: 0, totalAccessibleIncome: 0 }
          return (
            <div key={player.id} className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                <span className="text-sm font-medium text-white">{player.name}</span>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Social Security ($/month)</label>
                <input
                  type="number"
                  min="0"
                  className={inp}
                  value={income.ssMonthly}
                  onChange={e => updateIncome(player.id, 'ssMonthly', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Accessible Household Support ($/month)</label>
                <input
                  type="number"
                  min="0"
                  className={inp}
                  value={income.accessibleSupport}
                  onChange={e => updateIncome(player.id, 'accessibleSupport', e.target.value)}
                />
              </div>
              <div className="pt-1 border-t border-zinc-700 text-xs space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>Annual SS</span>
                  <span className="text-white">{fmt$(rpt.annualSS)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Annual Support</span>
                  <span className="text-white">{fmt$(rpt.annualSupport)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-amber-400">Total Accessible Income</span>
                  <span className="text-amber-400">{fmt$(rpt.totalAccessibleIncome)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
        <strong>Credit Application Guidance:</strong> Enter the Total Accessible Income figure in the
        &ldquo;Annual Income&rdquo; field. Do NOT list Social Security as a separate income source.
        Combined household accessible income:{' '}
        <strong className="text-amber-200">{fmt$(report.combinedHousehold)}/year</strong>
      </div>
    </div>
  )
}
