import { useState } from 'react'
import { AlertTriangle, Info, CreditCard, Calendar, Scissors, Gift, Shield, RefreshCw, Heart, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react'

const LS_DISMISSED = 'churner_dismissed_actions'

function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DISMISSED)) ?? []) } catch { /* corrupt cache */ return new Set() }
}
function saveDismissed(set) {
  try { localStorage.setItem(LS_DISMISSED, JSON.stringify([...set])) } catch { /* ignore */ }
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
  critical: { border: 'border-l-danger',   badge: 'bg-danger/20 text-danger-ink',   icon: 'text-danger-ink' },
  warning:  { border: 'border-l-warning', badge: 'bg-warning/20 text-warning-ink', icon: 'text-warning-ink' },
  info:     { border: 'border-l-info',  badge: 'bg-info/20 text-accent-ink',  icon: 'text-accent-ink' },
}

function ActionItem({ item, members, onDismiss, dismissed }) {
  const [expanded, setExpanded] = useState(false)
  const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.info
  const Icon = CATEGORY_ICON[item.category] ?? Info
  const TypeIcon = item.type === 'critical' || item.type === 'warning' ? AlertTriangle : Info
  const member = (members ?? []).find(p => p.id === item.memberId)

  return (
    <div className={`border-l-4 ${dismissed ? 'border-l-edge-strong opacity-60' : s.border} bg-surface border border-edge rounded-r-xl overflow-hidden`}>
      <div className="flex items-stretch">
        <button
          className="flex-1 text-left p-4 min-w-0"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-start gap-3">
            <TypeIcon size={15} className={`flex-shrink-0 mt-0.5 ${dismissed ? 'text-ink-faint' : s.icon}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink leading-tight">{item.title}</span>
                {member && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.hex }} />
                    <span className="text-xs text-ink-tertiary">{member.name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dismissed ? 'bg-overlay text-ink-tertiary' : s.badge}`}>{item.action}</span>
                <Icon size={11} className="text-ink-faint" />
                <span className="text-xs text-ink-faint capitalize">{item.category.replace('_', ' ')}</span>
              </div>
            </div>
            <span className="text-ink-faint flex-shrink-0">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </button>
        <button
          onClick={onDismiss}
          title={dismissed ? 'Restore' : 'Dismiss'}
          className="flex-shrink-0 px-3 text-ink-faint hover:text-ink-secondary transition-colors border-l border-edge"
        >
          {dismissed ? <RotateCcw size={13} /> : <X size={13} />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <p className="text-sm text-ink-muted leading-relaxed">{item.detail}</p>
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
        <h2 className="text-base font-semibold text-ink">Action Items</h2>
        <div className="flex items-center gap-2">
          {critical.length > 0 && (
            <span className="text-xs font-semibold bg-danger/20 text-danger-ink px-2 py-0.5 rounded-full">
              {critical.length} urgent
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-xs font-semibold bg-warning/20 text-warning-ink px-2 py-0.5 rounded-full">
              {warnings.length} warning
            </span>
          )}
          {info.length > 0 && (
            <span className="text-xs font-semibold bg-overlay text-ink-muted px-2 py-0.5 rounded-full">
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
            className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink-muted transition-colors"
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
