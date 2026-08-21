import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { buildMoneyMap } from '../../engines/moneyFlow'
import { collectReminders } from '../../engines/reminders'
import { fmt$0, fmtDateCompact } from '../../utils/format'
import { Waypoints, ChevronRight, Clock, Bell, PiggyBank } from 'lucide-react'

// The Dashboard's one-line answer to "where's my cash?". Deliberately small:
// the three numbers that change day to day, the accounts holding the most, and
// the next thing to check on — everything else lives on the Money Map itself.

export default function MoneyMapSummary() {
  const { state } = useChurn()
  const navigate = useNavigate()
  const map = useMemo(() => buildMoneyMap(state), [state])
  const reminders = useMemo(() => collectReminders(state, { horizonDays: 45 }), [state])
  const { totals, hub } = map

  const topAccounts = map.accounts
    .filter(n => (n.balance ?? 0) > 0)
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .slice(0, 4)

  const next = reminders[0] ?? null

  return (
    <section>
      <button
        onClick={() => navigate('/money')}
        className="w-full bg-surface border border-edge rounded-xl shadow-card overflow-hidden text-left hover:border-edge-strong transition-colors"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-edge">
          <Waypoints size={15} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink">Money Map</h2>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-tertiary">
            Open <ChevronRight size={13} />
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-edge">
          <div className="px-3 py-3 text-center">
            <div className="text-[11px] text-ink-tertiary mb-0.5">In accounts</div>
            <div className={`text-base font-bold tabular-nums ${totals.inAccounts > 0 ? 'text-warning-ink' : 'text-ink'}`}>
              {fmt$0(totals.inAccounts)}
            </div>
            <div className="text-[10px] text-ink-faint">{totals.accountsHoldingCash} holding cash</div>
          </div>
          <div className="px-3 py-3 text-center">
            <div className="text-[11px] text-ink-tertiary mb-0.5">In flight</div>
            <div className={`text-base font-bold tabular-nums ${totals.inFlight > 0 ? 'text-accent-ink' : 'text-ink'}`}>
              {fmt$0(totals.inFlight)}
            </div>
            <div className="text-[10px] text-ink-faint">{totals.inFlightCount} transfer{totals.inFlightCount === 1 ? '' : 's'}</div>
          </div>
          <div className="px-3 py-3 text-center">
            <div className="text-[11px] text-ink-tertiary mb-0.5">At the hub</div>
            <div className="text-base font-bold tabular-nums text-success-ink">
              {totals.atHub == null ? '—' : fmt$0(totals.atHub)}
            </div>
            <div className="text-[10px] text-ink-faint truncate">{hub?.name ?? 'no hub set'}</div>
          </div>
        </div>

        {topAccounts.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-edge flex-wrap">
            <PiggyBank size={12} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
            {topAccounts.map(n => (
              <span key={n.key} className="text-[11px] text-ink-muted bg-raised border border-edge rounded-full px-2 py-0.5 whitespace-nowrap">
                {n.name} <span className="tabular-nums font-medium text-ink-secondary">{fmt$0(n.balance)}</span>
              </span>
            ))}
          </div>
        )}

        {next && (
          <div className="flex items-center gap-2 px-4 py-2 border-t border-edge bg-raised/40">
            {next.state === 'overdue' || next.state === 'today' ? (
              <Bell size={12} className="text-danger-ink flex-shrink-0" aria-hidden="true" />
            ) : (
              <Clock size={12} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
            )}
            <span className="text-[11px] text-ink-muted min-w-0 truncate flex-1">{next.title}</span>
            <span className={`text-[11px] font-medium flex-shrink-0 ${next.state === 'overdue' ? 'text-danger-ink' : 'text-ink-tertiary'}`}>
              {next.state === 'overdue'
                ? `${Math.abs(next.days)}d overdue`
                : next.state === 'today'
                ? 'today'
                : next.dueDate
                ? fmtDateCompact(next.dueDate)
                : 'idle cash'}
            </span>
          </div>
        )}
      </button>
    </section>
  )
}
