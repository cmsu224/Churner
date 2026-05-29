import { useChurn } from '../../store/ChurnContext'
import { getAccountAgeStats, getKeepAliveCards } from '../../engines/creditAge'
import { fmtDate } from '../../utils/format'
import { Heart, Clock, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'

const USAGE_STYLE = {
  ok: { icon: CheckCircle, color: 'text-emerald-400', label: 'Active' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', label: 'Use soon' },
  critical: { icon: AlertTriangle, color: 'text-red-400', label: 'At risk' },
  unknown: { icon: HelpCircle, color: 'text-zinc-500', label: 'No usage date' },
}

function PlayerAge({ player, cards }) {
  const stats = getAccountAgeStats(cards)
  const keepAlive = getKeepAliveCards(cards)

  if (stats.count === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.hex }} />
          <span className="font-semibold text-white text-sm">{player.name}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Clock size={12} />
          <span>Avg age <span className="text-white font-medium">{stats.aaoaLabel}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Heart size={11} className="text-rose-400" />
        <span className="text-xs font-medium text-zinc-300">Keep these alive (oldest accounts)</span>
      </div>

      <div className="space-y-1.5">
        {keepAlive.map(({ card, age, daysSinceUsed, usageStatus }) => {
          const style = USAGE_STYLE[usageStatus]
          const Icon = style.icon
          return (
            <div key={card.id} className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
              <Icon size={13} className={`flex-shrink-0 ${style.color}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
                </div>
                <div className="text-xs text-zinc-500">
                  {age?.label} old · opened {fmtDate(card.openDate)}
                </div>
              </div>
              <div className={`text-xs font-medium flex-shrink-0 ${style.color}`}>
                {usageStatus === 'unknown'
                  ? style.label
                  : daysSinceUsed === 0
                  ? 'Used today'
                  : `${daysSinceUsed}d ago`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CreditAgeSection() {
  const { state } = useChurn()
  const players = state.players ?? []

  const playersWithCards = players.filter(
    p => (state.creditCards ?? []).some(c => c.playerId === p.id && c.status !== 'Closed' && c.openDate)
  )

  if (playersWithCards.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Credit Age & Keep-Alive</h2>
        <span className="text-xs text-zinc-500">Protects ~15% of your score</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playersWithCards.map(player => (
          <PlayerAge
            key={player.id}
            player={player}
            cards={(state.creditCards ?? []).filter(c => c.playerId === player.id)}
          />
        ))}
      </div>
    </section>
  )
}
