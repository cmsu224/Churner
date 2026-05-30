import { useState } from 'react'
import { AlertTriangle, Info, CreditCard, Calendar, Scissors, Gift, Shield, RefreshCw, Heart, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react'

const LS_DISMISSED = 'churner_dismissed_actions'

function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DISMISSED)) ?? []) } catch { return new Set() }
}
function saveDismissed(set) {
  try { localStorage.setItem(LS_DISMISSED, JSON.stringify([...set])) } catch {}
}

const CATEGORY_ICON = {
  spend: CreditCard,
  annual_fee: Calendar,
  cancel: Scissors,
  bonus: Gift,
  clawback: Shield,
  reeligible: RefreshCw,
  keepalive: Heart,
}

const TYPE_STYLES = {
  critical: { border: 'border-l-red-500',   badge: 'bg-red-500/20 text-red-400',   icon: 'text-red-400' },
  warning:  { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-400', icon: 'text-amber-400' },
  info:     { border: 'border-l-blue-500',  badge: 'bg-blue-500/20 text-blue-400',  icon: 'text-blue-400' },
}

function ActionItem({ item, members, onDismiss, dismissed }) {
  const [expanded, setExpanded] = useState(false)
  const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.info
  const Icon = CATEGORY_ICON[item.category] ?? Info
  const TypeIcon = item.type === 'critical' || item.type === 'warning' ? AlertTriangle : Info
  const member = (members ?? []).find(p => p.id === item.memberId)

  return (
    <div className={`border-l-4 ${dismissed ? 'border-l-zinc-700 opacity-60' : s.border} bg-zinc-900 border border-zinc-800 rounded-r-xl overflow-hidden`}>
      <div className="flex items-stretch">
        <button
          className="flex-1 text-left p-4 min-w-0"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-start gap-3">
            <TypeIcon size={15} className={`flex-shrink-0 mt-0.5 ${dismissed ? 'text-zinc-600' : s.icon}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white leading-tight">{item.title}</span>
                {member && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.hex }} />
                    <span className="text-xs text-zinc-500">{member.name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dismissed ? 'bg-zinc-700 text-zinc-500' : s.badge}`}>{item.action}</span>
                <Icon size={11} className="text-zinc-600" />
                <span className="text-xs text-zinc-600 capitalize">{item.category.replace('_', ' ')}</span>
              </div>
            </div>
            <span className="text-zinc-600 flex-shrink-0">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </button>
        <button
          onClick={onDismiss}
          title={dismissed ? 'Restore' : 'Dismiss'}
          className="flex-shrink-0 px-3 text-zinc-600 hover:text-zinc-300 transition-colors border-l border-zinc-800"
        >
          {dismissed ? <RotateCcw size={13} /> : <X size={13} />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
        </div>
      )}
    </div>
  )
}

export default function ActionQueue({ items, state }) {
  const members = state?.members ?? []
  const [dismissed, setDismissed] = useState(loadDismissed)
  const [showDismissed, setShowDismissed] = useState(false)

  function dismiss(id) {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }

  function restore(id) {
    setDismissed(prev => {
      const next = new Set(prev)
      next.delete(id)
      saveDismissed(next)
      return next
    })
  }

  const active = items.filter(i => !dismissed.has(i.id))
  const dismissedItems = items.filter(i => dismissed.has(i.id))

  const critical = active.filter(i => i.type === 'critical')
  const warnings = active.filter(i => i.type === 'warning')
  const info = active.filter(i => i.type === 'info')

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
        {active.map(item => (
          <ActionItem key={item.id} item={item} members={members} onDismiss={() => dismiss(item.id)} dismissed={false} />
        ))}
      </div>

      {dismissedItems.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowDismissed(s => !s)}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {showDismissed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Dismissed ({dismissedItems.length})
          </button>
          {showDismissed && (
            <div className="space-y-2 mt-2">
              {dismissedItems.map(item => (
                <ActionItem key={item.id} item={item} members={members} onDismiss={() => restore(item.id)} dismissed />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
