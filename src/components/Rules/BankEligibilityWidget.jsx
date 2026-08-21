import { useChurn } from '../../store/ChurnContext'
import { getBankEligibility, BASIS_LABEL, ANCHOR_SHORT } from '../../engines/bankEligibility'
import IssuerLogo from '../shared/IssuerLogo'
import { fmtDate } from '../../utils/format'
import { CheckCircle, Clock, Ban } from 'lucide-react'

function Row({ row }) {
  let icon, color, right
  if (row.lifetime) {
    icon = <Ban size={13} className="text-ink-tertiary flex-shrink-0" />
    color = 'text-ink-tertiary'
    right = 'Once per lifetime'
  } else if (row.eligible) {
    icon = <CheckCircle size={13} className="text-success-ink flex-shrink-0" />
    color = 'text-success-ink'
    right = 'Eligible now'
  } else if (row.daysUntil <= 0 && row.stillOpen) {
    // Cooldown served, but a new-customer offer won't pay a current customer.
    icon = <Clock size={13} className="text-warning-ink flex-shrink-0" />
    color = 'text-warning-ink'
    right = 'Close first'
  } else {
    icon = <Clock size={13} className="text-warning-ink flex-shrink-0" />
    color = 'text-warning-ink'
    right = `${row.daysUntil}d · ${fmtDate(row.eligibleDate)}`
  }
  return (
    <div className="flex items-center gap-2 py-1.5">
      <IssuerLogo name={row.key === 'other' ? '' : row.bankName} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-ink truncate">{row.bankName}</span>
          {row.chex === 'sensitive' && (
            <span className="text-[10px] font-medium text-warning-ink bg-warning/15 rounded px-1 py-px flex-shrink-0">Chex</span>
          )}
        </div>
        <div className="text-xs text-ink-tertiary truncate">
          {row.lifetime ? 'lifetime rule' : `~${row.months}mo from ${BASIS_LABEL[row.basis] ?? 'last bonus'}`}
          {row.anchor && ` · ${ANCHOR_SHORT[row.anchorFrom] ?? ''} ${fmtDate(row.anchor)}`}
        </div>
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${color}`}>{right}</span>
      <span className="flex-shrink-0">{icon}</span>
    </div>
  )
}

export default function BankEligibilityWidget() {
  const { state } = useChurn()
  const players = state.members ?? []
  const accounts = state.bankAccounts ?? []

  const withAccounts = players.filter(p => accounts.some(a => a.memberId === p.id))
  if (withAccounts.length === 0) return null

  return (
    <div className="bg-surface border border-edge-strong rounded-xl p-5">
      <h3 className="text-base font-semibold text-ink mb-1">Bank Bonus Eligibility</h3>
      <p className="text-xs text-ink-muted mb-4">
        When you can earn each bank&apos;s new-account bonus again. Each bank&apos;s cooldown counts from whatever
        its own terms measure — the last bonus, the day you closed the account, or the day you opened it — so the
        anchor date under each row is the one that rule actually uses. Windows are estimates: verify current terms
        on Doctor of Credit before applying.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {withAccounts.map(player => {
          const rows = getBankEligibility(player.id, accounts)
          return (
            <div key={player.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
                <span className="text-sm font-medium text-ink">{player.name}</span>
              </div>
              <div className="divide-y divide-edge">
                {rows.map(row => <Row key={row.key} row={row} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
