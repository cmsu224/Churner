import { useChurn } from '../../store/ChurnContext'
import { getTaxSummary } from '../../engines/taxPredictor'
import { fmt$ } from '../../utils/format'

const BRACKETS = [10, 12, 22, 24, 32, 35, 37]

export default function TaxView() {
  const { state, dispatch } = useChurn()
  const summary = getTaxSummary(state.bankAccounts, state.members, state.taxYear)
  const bracket = state.settings?.taxBracket ?? 22
  const householdTax = (summary.totals.bankBonuses * bracket) / 100

  function exportCSV() {
    const rows = [
      ['Member', 'Bank Bonuses (Taxable)', 'CC Bonuses (Tax-Free)', 'Estimated 1099-INT'],
      ...summary.rows.map(r => [r.memberName, r.bankBonuses.toFixed(2), '0.00', r.bankBonuses.toFixed(2)]),
      ['HOUSEHOLD TOTAL', summary.totals.bankBonuses.toFixed(2), '0.00', summary.totals.bankBonuses.toFixed(2)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `churner-tax-${state.taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Tax Liability — {state.taxYear}</h1>
        <button
          onClick={exportCSV}
          className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-zinc-400">Tax Bracket:</label>
        <select
          value={bracket}
          onChange={e => dispatch({ type: 'SET_TAX_BRACKET', bracket: parseInt(e.target.value) })}
          className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {BRACKETS.map(b => <option key={b} value={b}>{b}%</option>)}
        </select>
        <span className="text-xs text-zinc-500">federal estimate on bank bonuses</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden mb-4">
        <div className="grid grid-cols-4 text-xs font-medium text-zinc-400 bg-zinc-800 px-4 py-2.5">
          <span>Member</span>
          <span className="text-right">Bank Bonuses</span>
          <span className="text-right">CC Bonuses</span>
          <span className="text-right">1099-INT Est.</span>
        </div>
        {summary.rows.map(row => (
          <div key={row.memberId} className="grid grid-cols-4 px-4 py-3 border-t border-zinc-800 text-sm">
            <span className="text-zinc-300 font-medium">{row.memberName}</span>
            <span className="text-right text-white">{fmt$(row.bankBonuses)}</span>
            <span className="text-right text-zinc-500 text-xs">
              $0.00 <span className="text-zinc-600">(rebate)</span>
            </span>
            <span className="text-right text-amber-400">{fmt$(row.bankBonuses)}</span>
          </div>
        ))}
        <div className="grid grid-cols-4 px-4 py-3 border-t border-zinc-700 bg-zinc-800/50 text-sm font-semibold">
          <span className="text-white">Household Total</span>
          <span className="text-right text-white">{fmt$(summary.totals.bankBonuses)}</span>
          <span className="text-right text-zinc-500">$0.00</span>
          <span className="text-right text-amber-400">{fmt$(summary.totals.bankBonuses)}</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-300 font-medium">Estimated Federal Tax on Bank Bonuses</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {bracket}% bracket × {fmt$(summary.totals.bankBonuses)} taxable
          </div>
        </div>
        <div className="text-2xl font-bold text-red-400">{fmt$(householdTax)}</div>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-xs text-zinc-400 space-y-2">
        <div className="font-medium text-zinc-300 mb-1">IRS Tax Treatment Reference</div>
        <div>
          <strong className="text-zinc-300">✓ Credit card sign-up bonuses</strong> — Non-taxable.
          IRS treats as purchase rebates (cost-basis reduction). No 1099 issued.
        </div>
        <div>
          <strong className="text-zinc-300">⚠ Bank account bonuses</strong> — Taxable as ordinary
          interest income. Banks issue 1099-INT for amounts ≥ $10.
        </div>
        <div>
          <strong className="text-zinc-300">⚠ Referral bonuses</strong> — Taxable as ordinary income
          regardless of source.
        </div>
        <div className="text-zinc-500 pt-1 border-t border-zinc-700">
          This tool provides estimates only. Consult a tax professional for advice specific to your situation.
        </div>
      </div>
    </div>
  )
}
