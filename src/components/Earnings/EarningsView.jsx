import { useMemo, useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getEarningsSummary, getCardEarnings, getAccountEarnings } from '../../engines/earnings'
import MonthlyEarningsChart from './charts'
import PageHeader from '../shared/PageHeader'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import { fmt$, fmtDate } from '../../utils/format'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

function ReceiptRow({ logo, name, memberId, realized, estimated, feesPaid, net, date }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="flex items-center gap-2 min-w-0 flex-1 basis-48">
        <IssuerLogo name={logo} size={22} />
        <span className="text-sm text-ink truncate">{name}</span>
        <PlayerBadge memberId={memberId} showName={false} />
      </span>
      <span className="text-xs text-ink-tertiary w-24">{date ? fmtDate(date) : '—'}</span>
      <span className="text-sm text-success-ink font-medium tabular-nums w-24 text-right">
        {realized > 0 ? `+${fmt$(realized)}` : '—'}
        {estimated && realized > 0 && <span className="text-warning-ink text-[10px] ml-0.5" title="Points valued at the program's global rate — adjust in Settings → Point Valuations">est.</span>}
      </span>
      {feesPaid != null && (
        <span className="text-sm text-danger-ink tabular-nums w-20 text-right">{feesPaid > 0 ? `−${fmt$(feesPaid)}` : '—'}</span>
      )}
      {net != null && (
        <span className={`text-sm font-semibold tabular-nums w-24 text-right ${net >= 0 ? 'text-ink' : 'text-danger-ink'}`}>{fmt$(net)}</span>
      )}
    </li>
  )
}

function ReceiptsSection({ title, children, count }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="bg-surface border border-edge rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-ink hover:bg-raised/60 transition-colors"
        aria-expanded={open}
      >
        <span>{title} <span className="text-xs text-ink-tertiary font-normal">{count}</span></span>
        {open ? <ChevronUp size={14} className="text-ink-tertiary" /> : <ChevronDown size={14} className="text-ink-tertiary" />}
      </button>
      {open && <ul className="divide-y divide-edge border-t border-edge">{children}</ul>}
    </section>
  )
}

export default function EarningsView() {
  const { state } = useChurn()
  const summary = useMemo(() => getEarningsSummary(state), [state])
  const { household, perMember, efficiency, monthly, anyEstimated } = summary
  const settings = state.settings ?? {}
  const currentYear = new Date().getFullYear()

  // Receipts: every item with money in or out, newest first, undated last
  const cardReceipts = useMemo(() => (state.creditCards ?? [])
    .map(c => ({ card: c, e: getCardEarnings(c, settings) }))
    .filter(({ e }) => e.realized > 0 || e.feesPaid > 0)
    .sort((a, b) => String(b.e.realizedDate ?? '').localeCompare(String(a.e.realizedDate ?? ''))), [state, settings])
  const acctReceipts = useMemo(() => (state.bankAccounts ?? [])
    .map(a => ({ acct: a, e: getAccountEarnings(a) }))
    .filter(({ e }) => e.realized > 0)
    .sort((a, b) => String(b.e.realizedDate ?? '').localeCompare(String(a.e.realizedDate ?? ''))), [state])

  const hasAnything = household.lifetime > 0 || household.feesPaid > 0
  const maxMemberNet = Math.max(1, ...perMember.map(m => Math.abs(m.lifetime - m.feesPaid)))
  const years = Object.keys(household.byYear).sort((a, b) => b - a)

  const efficiencyBits = []
  if (efficiency.bonusPerDollarSpend > 0) efficiencyBits.push(`$${efficiency.bonusPerDollarSpend.toFixed(2)} bonus per $1 of required spend`)
  if (efficiency.avgDaysToBonus != null) efficiencyBits.push(`avg ${efficiency.avgDaysToBonus} days from open to bonus`)
  if (efficiency.completedBonuses > 0) efficiencyBits.push(`${efficiency.completedBonuses} card bonus${efficiency.completedBonuses !== 1 ? 'es' : ''} completed`)

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Earnings" />

      {!hasAnything ? (
        <EmptyState
          icon={TrendingUp}
          title="No realized bonuses yet"
          hint="Mark card and bank bonuses as received (with a date) and the household's actual earnings will chart here."
        />
      ) : (
        <>
          {/* Headline stats */}
          <section aria-label="Earnings summary">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Lifetime Net"
                value={fmt$(household.net)}
                sub={`${fmt$(household.lifetime)} earned`}
                tone={household.net >= 0 ? 'success' : 'danger'}
              />
              <StatCard label="Trailing 12 Months" value={fmt$(household.trailing12)} />
              <StatCard label={`This Year (${currentYear})`} value={fmt$(household.byYear[currentYear] ?? 0)} />
              <StatCard label="Fees Paid" value={fmt$(household.feesPaid)} tone={household.feesPaid > 0 ? 'danger' : 'default'} sub="estimated from anniversaries" />
            </div>
            {years.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {years.map(y => (
                  <span key={y} className="text-xs bg-raised text-ink-secondary rounded-md px-2 py-1 tabular-nums">
                    {y}: <span className="font-semibold text-ink">{fmt$(household.byYear[y])}</span>
                  </span>
                ))}
              </div>
            )}
            {efficiencyBits.length > 0 && (
              <p className="text-xs text-ink-muted mt-3">Efficiency: {efficiencyBits.join(' · ')}</p>
            )}
            {anyEstimated && (
              <p className="text-[11px] text-ink-tertiary mt-1">
                * points/miles bonuses valued at their program&rsquo;s global rate — adjust in Settings → Point Valuations.
              </p>
            )}
          </section>

          {/* Earnings over time */}
          <section>
            <h2 className="text-base font-semibold text-ink mb-3">Earnings Over Time <span className="text-xs text-ink-tertiary font-normal">last 24 months</span></h2>
            {monthly.some(m => m.total > 0) ? (
              <div className="bg-surface border border-edge rounded-xl p-4 overflow-x-auto">
                <div className="min-w-[560px]">
                  <MonthlyEarningsChart monthly={monthly} members={state.members ?? []} />
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-edge rounded-xl p-6 text-center text-sm text-ink-tertiary">
                No dated bonuses in the last 24 months.
              </div>
            )}
          </section>

          {/* Per-member breakdown — headline number is lifetime NET (bonuses −
              fees), so a member whose fees outrun their bonuses shows a negative
              in red. Bar color is semantic (green positive / red negative), not
              the member's identity color — that stays on the dot by their name. */}
          <section>
            <h2 className="text-base font-semibold text-ink mb-3">By Member <span className="text-xs text-ink-tertiary font-normal">lifetime net = bonuses − fees</span></h2>
            <div className="bg-surface border border-edge rounded-xl divide-y divide-edge">
              {perMember.map(m => {
                const net = m.lifetime - m.feesPaid
                return (
                  <div key={m.memberId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.hex }} />
                        <span className="text-sm font-medium text-ink">{m.name}</span>
                      </span>
                      <span className={`text-sm font-semibold tabular-nums ${net < 0 ? 'text-danger-ink' : 'text-ink'}`}>{fmt$(net)}</span>
                    </div>
                    <div className="h-2 bg-raised rounded-full overflow-hidden" aria-hidden="true">
                      <div
                        className={`h-full rounded-full transition-all ${net < 0 ? 'bg-danger' : 'bg-success'}`}
                        style={{ width: `${Math.round((Math.abs(net) / maxMemberNet) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-ink-tertiary mt-1 tabular-nums">
                      earned {fmt$(m.lifetime)} · cards {fmt$(m.lifetime - m.bankTotal)} · banks {fmt$(m.bankTotal)}{m.feesPaid > 0 ? <span className="text-danger-ink"> · fees −{fmt$(m.feesPaid)}</span> : null}
                      {m.trailing12 > 0 ? ` · T12M ${fmt$(m.trailing12)}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Receipts */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ink">The Receipts</h2>
            <div className="hidden sm:flex text-[10px] uppercase tracking-wider text-ink-faint px-3 gap-3">
              <span className="flex-1 basis-48">Item</span>
              <span className="w-24">Date</span>
              <span className="w-24 text-right">Realized</span>
              <span className="w-20 text-right">Fees</span>
              <span className="w-24 text-right">Net</span>
            </div>
            {cardReceipts.length > 0 && (
              <ReceiptsSection title="Cards" count={cardReceipts.length}>
                {cardReceipts.map(({ card, e }) => (
                  <ReceiptRow
                    key={card.id}
                    logo={card.issuer || card.cardName}
                    name={card.cardName}
                    memberId={card.memberId}
                    realized={e.realized}
                    estimated={e.estimated}
                    feesPaid={e.feesPaid}
                    net={e.net}
                    date={e.realizedDate}
                  />
                ))}
              </ReceiptsSection>
            )}
            {acctReceipts.length > 0 && (
              <ReceiptsSection title="Bank Accounts" count={acctReceipts.length}>
                {acctReceipts.map(({ acct, e }) => (
                  <ReceiptRow
                    key={acct.id}
                    logo={acct.bankName}
                    name={acct.bankName + (acct.last4 ? ` ···${acct.last4}` : '')}
                    memberId={acct.memberId}
                    realized={e.realized}
                    date={e.realizedDate}
                  />
                ))}
              </ReceiptsSection>
            )}
            {cardReceipts.length === 0 && acctReceipts.length === 0 && (
              <p className="text-sm text-ink-tertiary">Nothing realized yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
