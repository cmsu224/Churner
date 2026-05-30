import { useChurn } from '../../store/ChurnContext'
import { getCardReeligibility } from '../../engines/cardReeligibility'
import IssuerLogo from '../shared/IssuerLogo'
import { fmtDate } from '../../utils/format'
import { CheckCircle, Clock, Lock } from 'lucide-react'

function Row({ row }) {
  let icon, color, right
  if (row.lifetime) {
    icon = <Lock size={13} className="text-zinc-500 flex-shrink-0" />
    color = 'text-zinc-500'
    right = 'Once per lifetime'
  } else if (row.eligible) {
    icon = <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
    color = 'text-emerald-400'
    right = 'Eligible now'
  } else {
    icon = <Clock size={13} className="text-amber-400 flex-shrink-0" />
    color = 'text-amber-400'
    right = `${row.daysUntil}d · ${fmtDate(row.eligibleDate)}`
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <IssuerLogo name={row.anchorCard?.issuer || row.anchorCard?.cardName || ''} size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate">{row.label}</div>
        <div className="text-xs text-zinc-500">
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
  const players = state.players ?? []
  const cards   = state.creditCards ?? []

  const withBonuses = players.filter(p =>
    cards.some(c => c.playerId === p.id && c.bonusReceived)
  )
  if (withBonuses.length === 0) return null

  const allRows = withBonuses.map(p => ({
    player: p,
    rows: getCardReeligibility(p.id, cards),
  })).filter(x => x.rows.length > 0)

  if (allRows.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Card Sign-up Bonus Re-eligibility</h3>
      <p className="text-xs text-zinc-400 mb-4">
        When each person can earn a card&apos;s sign-up bonus again. Measured from the date the
        bonus was received. Chase Sapphire Preferred and Reserve share the same 48-month window.
        Amex personal cards use once-per-lifetime language. Verify current terms before applying.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {allRows.map(({ player, rows }) => (
          <div key={player.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
              <span className="text-sm font-medium text-white">{player.name}</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {rows.map(row => <Row key={row.key} row={row} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
