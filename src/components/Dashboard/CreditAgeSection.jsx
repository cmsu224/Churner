import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getAccountAgeStats, getKeepAliveCards } from '../../engines/creditAge'
import { getAnnualFeeInfo } from '../../engines/lifecycle'
import { fmtDate, fmtDateShort } from '../../utils/format'
import { Clock, AlertTriangle, CheckCircle, HelpCircle, Star, ChevronDown, ChevronUp, Zap } from 'lucide-react'

const USAGE_STYLE = {
  ok: { icon: CheckCircle, color: 'text-emerald-400', label: 'Active' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', label: 'Use soon' },
  critical: { icon: AlertTriangle, color: 'text-red-400', label: 'At risk' },
  unknown: { icon: HelpCircle, color: 'text-zinc-500', label: 'No usage date' },
}

const COLLAPSED_LIMIT = 5

function CardRow({ card, age, daysSinceUsed, usageStatus, isOldest }) {
  const { dispatch } = useChurn()
  const style = USAGE_STYLE[usageStatus]
  const Icon = style.icon

  function markUsedToday() {
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, lastUsedDate: new Date().toISOString().slice(0, 10) } })
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-800/60 rounded-lg px-3 py-2">
      <Icon size={13} className={`flex-shrink-0 ${style.color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
          {isOldest && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
          {card.cardName}{card.last4 ? ` ···${card.last4}` : ''}
        </div>
        <div className="text-xs text-zinc-500">
          {age ? `${age.label} old · opened ${fmtDate(card.openDate)}` : 'No open date set'}
        </div>
        {(card.annualFee > 0) && (() => {
          const fi = getAnnualFeeInfo(card)
          const feeColor = fi && fi.daysUntilFee >= 0 && fi.daysUntilFee <= 30
            ? 'text-amber-500'
            : 'text-zinc-600'
          return (
            <div className={`text-xs ${feeColor}`}>
              ${card.annualFee}/yr · fee due {fi ? fmtDateShort(fi.feeDate) : '—'}
              {fi && fi.daysUntilFee >= 0 && fi.daysUntilFee <= 45 && (
                <span> ({fi.daysUntilFee}d)</span>
              )}
            </div>
          )
        })()}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`text-xs font-medium ${style.color}`}>
          {usageStatus === 'unknown'
            ? style.label
            : daysSinceUsed === 0
            ? 'Used today'
            : `${daysSinceUsed}d ago`}
        </div>
        {daysSinceUsed !== 0 && (
          <button
            onClick={markUsedToday}
            title="Mark used today"
            className="flex items-center gap-0.5 bg-zinc-700 hover:bg-emerald-700 text-zinc-400 hover:text-white text-xs px-1.5 py-0.5 rounded transition-colors"
          >
            <Zap size={10} />
          </button>
        )}
      </div>
    </div>
  )
}

function PlayerAge({ player, cards }) {
  const [showAll, setShowAll] = useState(false)
  const stats = getAccountAgeStats(cards)
  const tracked = getKeepAliveCards(cards)

  if (tracked.length === 0) return null

  const atRisk = tracked.filter(t => t.usageStatus === 'critical' || t.usageStatus === 'warning').length
  const visible = showAll ? tracked : tracked.slice(0, COLLAPSED_LIMIT)

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

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-300">
          Card usage ({tracked.length} open)
        </span>
        {atRisk > 0 && (
          <span className="text-xs font-medium text-amber-400">{atRisk} need{atRisk === 1 ? 's' : ''} attention</span>
        )}
      </div>

      <div className="space-y-1.5">
        {visible.map(t => <CardRow key={t.card.id} {...t} />)}
      </div>

      {tracked.length > COLLAPSED_LIMIT && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors py-1.5"
        >
          {showAll
            ? <>Show less <ChevronUp size={12} /></>
            : <>Show {tracked.length - COLLAPSED_LIMIT} more <ChevronDown size={12} /></>}
        </button>
      )}

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-600">
        <Star size={9} className="text-amber-400 fill-amber-400" />
        <span>= one of the 3 oldest accounts (highest priority to keep open)</span>
      </div>
    </div>
  )
}

export default function CreditAgeSection() {
  const { state } = useChurn()
  const players = state.members ?? []

  const playersWithCards = players.filter(
    p => (state.creditCards ?? []).some(c => c.memberId === p.id && c.status !== 'Closed')
  )

  if (playersWithCards.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Credit Age & Card Usage</h2>
        <span className="text-xs text-zinc-500">Protects ~15% of your score</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {playersWithCards.map(player => (
          <PlayerAge
            key={player.id}
            player={player}
            cards={(state.creditCards ?? []).filter(c => c.memberId === player.id)}
          />
        ))}
      </div>
    </section>
  )
}
