import { useState } from 'react'
import { getClosedAccountReeligibility } from '../../engines/bankReeligibility'
import { flashItem } from '../../hooks/useHighlight'
import ReapplyClock from './ReapplyClock'
import IssuerLogo from '../shared/IssuerLogo'
import PlayerBadge from '../shared/PlayerBadge'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

// The second bank clock, collected in one place: for every account you've
// CLOSED, when that bank will pay a new-account bonus again. Open accounts are
// deliberately absent — they're still on the first clock (the 181-day clawback
// shield), and no bank pays a new-customer bonus to a current customer.
export default function ReapplyTracker({ accounts, members, memberId }) {
  const [open, setOpen] = useState(true)
  const rows = getClosedAccountReeligibility(accounts, memberId === 'all' ? null : memberId)
  if (rows.length === 0) return null

  const eligibleNow = rows.filter(r => r.state === 'eligible' && !r.bankStillOpen).length
  const soonest = rows.find(r => r.state === 'cooling')

  return (
    <div className="bg-surface border border-edge rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-4 text-left hover:bg-raised/50 transition-colors"
      >
        <RefreshCw size={15} className="text-accent-ink flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">Reapply Eligibility</div>
          <div className="text-xs text-ink-muted">
            {rows.length} closed account{rows.length !== 1 ? 's' : ''}
            {eligibleNow > 0
              ? ` · ${eligibleNow} eligible to reapply now`
              : soonest ? ` · next opens in ${soonest.daysUntil}d` : ''}
          </div>
        </div>
        <span className="text-ink-tertiary flex-shrink-0">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>

      {open && (
        <div className="border-t border-edge divide-y divide-edge">
          {rows.map(row => (
            <div
              key={row.accountId}
              onClick={() => flashItem(row.accountId)}
              className="p-4 cursor-pointer hover:bg-raised/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <IssuerLogo name={row.key === 'other' ? '' : row.bankName} size={24} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink truncate">{row.bankName}</span>
                    {row.last4 && <span className="text-xs text-ink-tertiary">···{row.last4}</span>}
                    {row.accountType && <span className="text-xs text-ink-tertiary">{row.accountType}</span>}
                  </div>
                </div>
                <PlayerBadge memberId={row.memberId} members={members} />
              </div>
              <ReapplyClock reapply={row} />
            </div>
          ))}
          <p className="p-4 text-xs text-ink-faint">
            Cooldowns are estimates measured from the last bonus (or the opened date when no bonus posted) —
            verify the current offer terms on Doctor of Credit before applying.
          </p>
        </div>
      )}
    </div>
  )
}
