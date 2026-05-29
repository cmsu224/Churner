import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { AlertTriangle, Info, CreditCard, Calendar, Zap, Scissors, Gift, Shield, RefreshCw, Heart, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

const CATEGORY_ICON = {
  spend: CreditCard,
  annual_fee: Calendar,
  autopay: Zap,
  cancel: Scissors,
  bonus: Gift,
  clawback: Shield,
  reeligible: RefreshCw,
  keepalive: Heart,
}

const TYPE_STYLES = {
  critical: {
    border: 'border-l-red-500',
    badge: 'bg-red-500/20 text-red-400',
    icon: 'text-red-400',
  },
  warning: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    icon: 'text-amber-400',
  },
  info: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/20 text-blue-400',
    icon: 'text-blue-400',
  },
}

function ActionItem({ item, players }) {
  const { state, dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [done, setDone] = useState(false)
  const s = TYPE_STYLES[item.type]
  const Icon = CATEGORY_ICON[item.category] ?? Info
  const TypeIcon = item.type === 'critical' ? AlertTriangle : item.type === 'warning' ? AlertTriangle : Info
  const player = (players ?? []).find(p => p.id === item.playerId)

  function markAutopayOn(e) {
    e.stopPropagation()
    const card = (state.creditCards ?? []).find(c => c.id === item.cardId)
    if (card) dispatch({ type: 'UPDATE_CARD', payload: { ...card, autoPayEnabled: true } })
    setDone(true)
  }

  if (done) return null

  return (
    <div className={`border-l-4 ${s.border} bg-zinc-900 border border-zinc-800 rounded-r-xl overflow-hidden`}>
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          <TypeIcon size={15} className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white leading-tight">{item.title}</span>
              {player && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: player.hex }} />
                  <span className="text-xs text-zinc-500">{player.name}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.badge}`}>{item.action}</span>
              <Icon size={11} className="text-zinc-600" />
              <span className="text-xs text-zinc-600 capitalize">{item.category.replace('_', ' ')}</span>
            </div>
          </div>
          <span className="text-zinc-600 flex-shrink-0">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
          {item.category === 'autopay' && item.cardId && (
            <button
              onClick={markAutopayOn}
              className="mt-3 flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle size={12} />
              AutoPay is now on — mark done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ActionQueue({ items, state }) {
  const players = state?.players ?? []
  const critical = items.filter(i => i.type === 'critical')
  const warnings = items.filter(i => i.type === 'warning')
  const info = items.filter(i => i.type === 'info')

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Action Items</h2>
        <div className="flex items-center gap-2">
          {critical.length > 0 && (
            <span className="text-xs font-semibold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {critical.length} urgent
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-xs font-semibold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              {warnings.length} warning
            </span>
          )}
          {info.length > 0 && (
            <span className="text-xs font-semibold bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
              {info.length} info
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <ActionItem key={item.id} item={item} players={players} />
        ))}
      </div>
    </section>
  )
}
