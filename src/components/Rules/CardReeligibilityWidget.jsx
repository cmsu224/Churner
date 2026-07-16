import { useChurn } from '../../store/ChurnContext'
import { getCardReeligibility } from '../../engines/cardReeligibility'
import IssuerLogo from '../shared/IssuerLogo'
import { fmtDate } from '../../utils/format'
import { CheckCircle, Clock, Lock } from 'lucide-react'

function Row({ row }) {
  let icon, color, right
  if (row.lifetime) {
    icon = <Lock size={13} className="text-ink-tertiary flex-shrink-0" />
    color = 'text-ink-tertiary'
    right = 'Once per lifetime'
  } else if (row.eligible) {
    icon = <CheckCircle size={13} className="text-success-ink flex-shrink-0" />
    color = 'text-success-ink'
    right = 'Eligible now'
  } else {
    icon = <Clock size={13} className="text-warning-ink flex-shrink-0" />
    color = 'text-warning-ink'
    right = `${row.daysUntil}d · ${fmtDate(row.eligibleDate)}`
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <IssuerLogo name={row.anchorCard?.issuer || row.anchorCard?.cardName || ''} size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-ink truncate">{row.label}</div>
        <div className="text-xs text-ink-tertiary">
          {row.lifetime ? 'lifetime rule' : `~${row.months}mo window`}
          {row.anchor && ` · bonus ${fmtDate(row.anchor)}`}
        </div>
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${color}`}>{right}</span>
      <span className="flex-shrink-0">{icon}</span>
    </div>
  )
}

export default function CardReeligibilityWidget() {
  const { state } = useChurn()
  const players = state.members ?? []
  const cards   = state.creditCards ?? []

  const withBonuses = players.filter(p =>
    cards.some(c => c.memberId === p.id && c.bonusReceived)
  )
  if (withBonuses.length === 0) return null

  const allRows = withBonuses.map(p => ({
    player: p,
    rows: getCardReeligibility(p.id, cards),
  })).filter(x => x.rows.length > 0)

  if (allRows.length === 0) return null

  return (
    <div className="bg-surface border border-edge-strong rounded-xl p-5">
      <h3 className="text-base font-semibold text-ink mb-1">Card Sign-up Bonus Re-eligibility</h3>
      <p className="text-xs text-ink-muted mb-4">
        When each person can earn a card&apos;s sign-up bonus again. Measured from the date the
        bonus was received. Chase Sapphire Preferred and Reserve share the same 48-month window.
        Amex personal cards use once-per-lifetime language. Verify current terms before applying.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {allRows.map(({ player, rows }) => (
          <div key={player.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
              <span className="text-sm font-medium text-ink">{player.name}</span>
            </div>
            <div className="divide-y divide-edge">
              {rows.map(row => <Row key={row.key} row={row} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
