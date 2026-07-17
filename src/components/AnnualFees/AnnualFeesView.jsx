import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import PageHeader from '../shared/PageHeader'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'
import IssuerLogo from '../shared/IssuerLogo'
import PlayerBadge from '../shared/PlayerBadge'
import { Pill } from '../shared/FilterBar'
import { getAnnualFeeSchedule } from '../../engines/annualFees'
import { fmt$, fmtDate } from '../../utils/format'
import { Receipt, CalendarClock, AlertCircle, ShieldCheck } from 'lucide-react'

// The one-line "when does it hit" summary for a fee row, with its tone. Refund
// windows are the most urgent (money already out the door, clock running), then
// upcoming fees by proximity, then the calm "next fee is months away" state.
function dueMeta(row) {
  if (row.inRefundWindow) {
    const d = row.refundDaysLeft
    return {
      tone: d != null && d <= 5 ? 'text-danger-ink' : 'text-warning-ink',
      icon: AlertCircle,
      label: `Fee posted — ${d}d to cancel for refund`,
      date: `by ${fmtDate(row.refundDeadline)}`,
    }
  }
  const d = row.daysUntilFee
  const soonTone = d <= 14 ? 'text-warning-ink' : d <= 45 ? 'text-info-ink' : 'text-ink-secondary'
  return {
    tone: soonTone,
    icon: CalendarClock,
    label: row.waivedFirstYear ? `First fee in ${d}d` : `Fee posts in ${d}d`,
    date: fmtDate(row.feeDate),
  }
}

export default function AnnualFeesView() {
  const { state } = useChurn()
  const navigate = useNavigate()
  const members = state.members ?? []
  const [filterMember, setFilterMember] = useState('all')

  const cards = (state.creditCards ?? []).filter(c => filterMember === 'all' || c.memberId === filterMember)
  const { rows, undated, totalAnnual, inRefund, dueSoon, next } = getAnnualFeeSchedule(cards)

  const hasAnyFeeCards = (state.creditCards ?? []).some(c => (c.annualFee > 0) && c.status !== 'Closed' && c.status !== 'Downgraded')

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader title="Annual Fees" />

      {!hasAnyFeeCards ? (
        <EmptyState
          icon={Receipt}
          title="No annual fees to track"
          hint="Once you add a card with an annual fee, its next due date, the 30-day cancel-for-refund window, and your total yearly fee burden all show up here."
          action={
            <button onClick={() => navigate('/cards')} className="text-sm text-accent-ink hover:underline">Go to Cards</button>
          }
        />
      ) : (
        <>
          {/* Totals — follow the person filter, so picking a member gives that
              person's yearly fee burden and upcoming dates. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Fees per year" value={fmt$(totalAnnual)} sub={`across ${rows.length} card${rows.length !== 1 ? 's' : ''}`} />
            <StatCard
              label="Next fee due"
              value={next ? fmtDate(next.feeDate) : '—'}
              sub={next ? next.card.cardName : 'nothing scheduled'}
            />
            <StatCard label="Due within 45 days" value={dueSoon.length} tone={dueSoon.length ? 'warning' : 'default'} />
            <StatCard label="In refund window" value={inRefund.length} tone={inRefund.length ? 'danger' : 'default'} sub="cancel for full refund" />
          </div>

          {/* Person filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <Pill active={filterMember === 'all'} onClick={() => setFilterMember('all')}>All</Pill>
            {members.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterMember(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterMember === p.id ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
                {p.name}
              </button>
            ))}
          </div>

          {rows.length === 0 && undated.length === 0 ? (
            <EmptyState icon={Receipt} title="No fee cards for this person" />
          ) : (
            <div className="space-y-2">
              {rows.map(row => {
                const meta = dueMeta(row)
                const Icon = meta.icon
                const card = row.card
                return (
                  <button
                    key={row.cardId}
                    onClick={() => navigate(`/cards?highlight=${row.cardId}`)}
                    className="w-full text-left bg-surface border border-edge hover:border-edge-strong rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <IssuerLogo name={card.issuer || card.cardName} size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-ink text-sm">{card.cardName}</span>
                            {card.last4 && <span className="text-ink-tertiary text-xs">···{card.last4}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <PlayerBadge memberId={card.memberId} members={members} />
                            {row.waivedFirstYear && (
                              <span className="flex items-center gap-1 text-xs text-success-ink">
                                <ShieldCheck size={11} /> 1st-year waived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-ink tabular-nums">{fmt$(row.annualFee)}<span className="text-xs font-medium text-ink-tertiary">/yr</span></div>
                        <div className="text-[11px] text-ink-faint mt-0.5">{row.fromPostDate ? 'from fee post date' : 'open-date anniversary'}</div>
                      </div>
                    </div>

                    <div className={`mt-2 flex items-center justify-between gap-2 text-xs font-medium ${meta.tone}`}>
                      <span className="flex items-center gap-1.5">
                        <Icon size={12} className="flex-shrink-0" />
                        {meta.label}
                      </span>
                      <span className="tabular-nums">{meta.date}</span>
                    </div>
                  </button>
                )
              })}

              {/* Fee cards missing an anchor date — can't be scheduled until the
                  user sets an open date or fee post date. */}
              {undated.map(card => (
                <button
                  key={card.id}
                  onClick={() => navigate(`/cards?highlight=${card.id}`)}
                  className="w-full text-left bg-surface border border-dashed border-edge-strong hover:border-warning/50 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <IssuerLogo name={card.issuer || card.cardName} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink text-sm">{card.cardName}</span>
                          {card.last4 && <span className="text-ink-tertiary text-xs">···{card.last4}</span>}
                        </div>
                        <div className="mt-1.5"><PlayerBadge memberId={card.memberId} members={members} /></div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-ink tabular-nums">{fmt$(card.annualFee)}<span className="text-xs font-medium text-ink-tertiary">/yr</span></div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning-ink">
                    <AlertCircle size={12} className="flex-shrink-0" />
                    Add an open date or fee post date to schedule this fee
                  </div>
                </button>
              ))}
            </div>
          )}

          <p className="text-[11px] text-ink-faint mt-4">
            Fees post on the anniversary of each card&rsquo;s open date — or its Annual Fee Post Date when set. Cancel before a fee posts to owe nothing,
            or within 30 days after for a full refund. These same dates feed the Timeline calendar and your action items.
          </p>
        </>
      )}
    </div>
  )
}
