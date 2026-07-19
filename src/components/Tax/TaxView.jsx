import { useChurn } from '../../store/ChurnContext'
import { getTaxSummary } from '../../engines/taxPredictor'
import { fmt$ } from '../../utils/format'
import { saveOrShare } from '../../utils/exportFile'

const BRACKETS = [10, 12, 22, 24, 32, 35, 37]

export default function TaxView() {
  const { state, dispatch } = useChurn()
  const summary = getTaxSummary(state.bankAccounts, state.members, state.taxYear)
  const bracket = state.settings?.taxBracket ?? 22
  const householdTax = (summary.totals.bankBonuses * bracket) / 100

  function exportCSV() {
    const rows = [
      ['Member', 'Bank Bonuses (Taxable)', 'Estimated 1099-INT'],
      ...summary.rows.map(r => [r.memberName, r.bankBonuses.toFixed(2), r.bankBonuses.toFixed(2)]),
      ['HOUSEHOLD TOTAL', summary.totals.bankBonuses.toFixed(2), summary.totals.bankBonuses.toFixed(2)],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    saveOrShare(`churner-tax-${state.taxYear}.csv`, csv, 'text/csv')
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-ink">Tax Liability — {state.taxYear}</h1>
        <button
          onClick={exportCSV}
          className="bg-raised hover:bg-overlay text-ink-secondary text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-ink-muted">Tax Bracket:</label>
        <select
          value={bracket}
          onChange={e => dispatch({ type: 'SET_TAX_BRACKET', bracket: parseInt(e.target.value) })}
          className="bg-raised border border-edge-strong rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
        >
          {BRACKETS.map(b => <option key={b} value={b}>{b}%</option>)}
        </select>
        <span className="text-xs text-ink-tertiary">federal estimate on bank bonuses</span>
      </div>

      <div className="bg-surface border border-edge-strong rounded-xl overflow-hidden mb-1.5">
        <div className="grid grid-cols-3 text-xs font-medium text-ink-muted bg-raised px-4 py-2.5">
          <span>Member</span>
          <span className="text-right">Bank Bonuses</span>
          <span className="text-right">1099-INT Est.</span>
        </div>
        {summary.rows.map(row => (
          <div key={row.memberId} className="grid grid-cols-3 px-4 py-3 border-t border-edge text-sm">
            <span className="text-ink-secondary font-medium">{row.memberName}</span>
            <span className="text-right text-ink">{fmt$(row.bankBonuses)}</span>
            <span className="text-right text-warning-ink">{fmt$(row.bankBonuses)}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 px-4 py-3 border-t border-edge-strong bg-raised/50 text-sm font-semibold">
          <span className="text-ink">Household Total</span>
          <span className="text-right text-ink">{fmt$(summary.totals.bankBonuses)}</span>
          <span className="text-right text-warning-ink">{fmt$(summary.totals.bankBonuses)}</span>
        </div>
      </div>
      <p className="text-[11px] text-ink-tertiary mb-4 px-1">
        Credit-card sign-up bonuses aren&rsquo;t listed — the IRS treats them as purchase rebates, not income, so they don&rsquo;t count for tax.
      </p>

      <div className="bg-surface border border-edge-strong rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-ink-secondary font-medium">Estimated Federal Tax on Bank Bonuses</div>
          <div className="text-xs text-ink-tertiary mt-0.5">
            {bracket}% bracket × {fmt$(summary.totals.bankBonuses)} taxable
          </div>
        </div>
        <div className="text-2xl font-bold text-danger-ink">{fmt$(householdTax)}</div>
      </div>

      <div className="bg-raised/50 border border-edge-strong rounded-xl p-4 text-xs text-ink-muted space-y-2">
        <div className="font-medium text-ink-secondary mb-1">IRS Tax Treatment Reference</div>
        <div>
          <strong className="text-ink-secondary">✓ Credit card sign-up bonuses</strong> — Non-taxable.
          IRS treats as purchase rebates (cost-basis reduction). No 1099 issued.
        </div>
        <div>
          <strong className="text-ink-secondary">⚠ Bank account bonuses</strong> — Taxable as ordinary
          interest income. Banks issue 1099-INT for amounts ≥ $10.
        </div>
        <div>
          <strong className="text-ink-secondary">⚠ Referral bonuses</strong> — Taxable as ordinary income
          regardless of source.
        </div>
        <div className="text-ink-tertiary pt-1 border-t border-edge-strong">
          This tool provides estimates only. Consult a tax professional for advice specific to your situation.
        </div>
      </div>
    </div>
  )
}
