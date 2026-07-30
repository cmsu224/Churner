import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { getTaxSummary, getTaxYears } from '../../engines/taxPredictor'
import { fmt$, fmtDate } from '../../utils/format'
import { AlertCircle } from 'lucide-react'

const BRACKETS = [10, 12, 22, 24, 32, 35, 37]

export default function TaxView() {
  const { state, dispatch } = useChurn()
  const navigate = useNavigate()
  // The stored tax year is whatever was last picked (or the year the Gist was
  // created), so a bonus received this year would silently vanish from the
  // table if the year weren't switchable.
  const years = getTaxYears(state.bankAccounts)
  const taxYear = state.taxYear ?? new Date().getFullYear()
  const summary = getTaxSummary(state.bankAccounts, state.members, taxYear)
  const bracket = state.settings?.taxBracket ?? 22
  const householdTax = (summary.totals.bankBonuses * bracket) / 100
  const yearOptions = years.includes(taxYear) ? years : [taxYear, ...years].sort((a, b) => b - a)
  const counted = summary.rows.flatMap(r => r.accounts.map(a => ({ ...a, memberName: r.memberName })))
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  function exportCSV() {
    const rows = [
      ['Member', 'Bank Bonuses (Taxable)', 'Estimated 1099-INT'],
      ...summary.rows.map(r => [r.memberName, r.bankBonuses.toFixed(2), r.bankBonuses.toFixed(2)]),
      ['HOUSEHOLD TOTAL', summary.totals.bankBonuses.toFixed(2), summary.totals.bankBonuses.toFixed(2)],
      [],
      ['Bank', 'Member', 'Received', 'Amount'],
      ...counted.map(a => [
        `${a.bankName ?? ''}${a.last4 ? ` ...${a.last4}` : ''}`,
        a.memberName,
        String(a.date ?? '').slice(0, 10),
        a.amount.toFixed(2),
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `churner-tax-${taxYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-ink">Tax Liability — {taxYear}</h1>
        <button
          onClick={exportCSV}
          className="bg-raised hover:bg-overlay text-ink-secondary text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="text-sm text-ink-muted" htmlFor="tax-year">Tax Year:</label>
        <select
          id="tax-year"
          value={taxYear}
          onChange={e => dispatch({ type: 'SET_TAX_YEAR', year: parseInt(e.target.value) })}
          className="bg-raised border border-edge-strong rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="text-sm text-ink-muted" htmlFor="tax-bracket">Tax Bracket:</label>
        <select
          id="tax-bracket"
          value={bracket}
          onChange={e => dispatch({ type: 'SET_TAX_BRACKET', bracket: parseInt(e.target.value) })}
          className="bg-raised border border-edge-strong rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-accent"
        >
          {BRACKETS.map(b => <option key={b} value={b}>{b}%</option>)}
        </select>
        <span className="text-xs text-ink-tertiary">federal estimate on bank bonuses</span>
      </div>

      {/* Received bonuses that couldn't be placed in a year — without this they
          would just be missing from the table with no explanation. */}
      {summary.undated.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-warning-ink flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink-secondary">
            <div className="font-medium text-warning-ink mb-1">
              {summary.undated.length} received bonus{summary.undated.length !== 1 ? 'es' : ''} not counted — no received date
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {summary.undated.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/accounts?highlight=${a.id}`)}
                  className="underline decoration-dotted hover:text-ink"
                >
                  {a.bankName}{a.last4 ? ` ···${a.last4}` : ''} · {fmt$(a.amount)}
                </button>
              ))}
            </div>
            <div className="text-ink-tertiary mt-1">Add the date the bonus posted so it lands in the right tax year.</div>
          </div>
        </div>
      )}

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
        {summary.otherYears.length > 0 && ` ${summary.otherYears.length} bank bonus${summary.otherYears.length !== 1 ? 'es' : ''} landed in another tax year.`}
        {summary.untaxed.length > 0 && ` ${summary.untaxed.length} bonus${summary.untaxed.length !== 1 ? 'es are' : ' is'} marked non-taxable on the account.`}
      </p>

      {/* What's behind the number — every account counted, so the total can be
          checked against the 1099-INTs as they arrive. */}
      {counted.length > 0 && (
        <div className="bg-surface border border-edge-strong rounded-xl overflow-hidden mb-4">
          <div className="text-xs font-medium text-ink-muted bg-raised px-4 py-2.5">Bonuses counted in {taxYear}</div>
          {counted.map(a => (
            <button
              key={a.id}
              onClick={() => navigate(`/accounts?highlight=${a.id}`)}
              className="w-full text-left grid grid-cols-[1fr_auto] gap-2 px-4 py-2.5 border-t border-edge text-sm hover:bg-raised/60 transition-colors"
            >
              <span className="min-w-0">
                <span className="text-ink-secondary font-medium">{a.bankName}</span>
                {a.last4 && <span className="text-ink-tertiary text-xs"> ···{a.last4}</span>}
                <span className="text-ink-tertiary text-xs"> · {a.memberName} · {fmtDate(a.date)}</span>
              </span>
              <span className="text-ink tabular-nums">{fmt$(a.amount)}</span>
            </button>
          ))}
        </div>
      )}

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
