import { useState } from 'react'
import { AlertTriangle, Info, CreditCard, Calendar, Scissors, Gift, Shield, RefreshCw, Heart, ChevronDown, ChevronUp, X, RotateCcw, Clock, CheckCircle } from 'lucide-react'
import { useActionItems } from '../../hooks/useActionItems'
import { fmtDate } from '../../utils/format'

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
  critical: { border: 'border-l-danger', badge: 'bg-danger/20 text-danger-ink', icon: 'text-danger-ink' },
  warning: { border: 'border-l-warning', badge: 'bg-warning/20 text-warning-ink', icon: 'text-warning-ink' },
  info: { border: 'border-l-info', badge: 'bg-info/20 text-accent-ink', icon: 'text-accent-ink' },
}

function ActionItem({ item, members, muted, mutedLabel, onDismiss, onSnooze, onRestore }) {
  const [expanded, setExpanded] = useState(false)
  const [snoozing, setSnoozing] = useState(false)
  const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.info
  const Icon = CATEGORY_ICON[item.category] ?? Info
  const TypeIcon = item.type === 'critical' || item.type === 'warning' ? AlertTriangle : Info
  const member = (members ?? []).find(p => p.id === item.memberId)

  return (
    <div className={`border-l-4 ${muted ? 'border-l-edge-strong opacity-60' : s.border} bg-surface border border-edge rounded-r-xl overflow-hidden`}>
      <div className="flex items-stretch">
        <button
          className="flex-1 text-left p-4 min-w-0"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-3">
            <TypeIcon size={15} className={`flex-shrink-0 mt-0.5 ${muted ? 'text-ink-faint' : s.icon}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink leading-tight">{item.title}</span>
                {member && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member.hex }} />
                    <span className="text-xs text-ink-tertiary">{member.name}</span>
                  </span>
                )}
                {muted && mutedLabel && <span className="text-[10px] text-ink-faint">{mutedLabel}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${muted ? 'bg-overlay text-ink-tertiary' : s.badge}`}>{item.action}</span>
                <Icon size={11} className="text-ink-faint" aria-hidden="true" />
                <span className="text-xs text-ink-faint capitalize">{item.category.replace('_', ' ')}</span>
              </div>
            </div>
            <span className="text-ink-faint flex-shrink-0">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>
        </button>
        {muted ? (
          <button
            onClick={onRestore}
            title="Restore"
            aria-label={`Restore: ${item.title}`}
            className="flex-shrink-0 px-3 text-ink-faint hover:text-ink-secondary transition-colors border-l border-edge"
          >
            <RotateCcw size={13} />
          </button>
        ) : (
          <div className="flex flex-col flex-shrink-0 border-l border-edge">
            <button
              onClick={onDismiss}
              title="Dismiss"
              aria-label={`Dismiss: ${item.title}`}
              className="flex-1 px-3 text-ink-faint hover:text-danger-ink transition-colors"
            >
              <X size={13} />
            </button>
            <button
              onClick={() => setSnoozing(x => !x)}
              title="Snooze"
              aria-label={`Snooze: ${item.title}`}
              className="flex-1 px-3 text-ink-faint hover:text-warning-ink transition-colors border-t border-edge"
            >
              <Clock size={13} />
            </button>
          </div>
        )}
      </div>
      {snoozing && !muted && (
        <div className="flex items-center gap-1.5 px-4 pb-3 -mt-1">
          <span className="text-[11px] text-ink-tertiary">Snooze for</span>
          {[1, 3, 7].map(d => (
            <button
              key={d}
              onClick={() => { onSnooze(d); setSnoozing(false) }}
              className="text-[11px] px-2 py-0.5 rounded-md bg-raised hover:bg-overlay text-ink-secondary transition-colors"
            >
              {d}d
            </button>
          ))}
        </div>
      )}
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-7">
          <p className="text-sm text-ink-muted leading-relaxed">{item.detail}</p>
        </div>
      )}
    </div>
  )
}

// Dismiss/snooze state lives in synced Gist state (see useActionItems), so a
// dismissal on one device holds on every device.
export default function ActionQueue({ members }) {
  const { active, snoozedItems, dismissedItems, dismiss, restore, snooze, snoozeUntil } = useActionItems()
  const [showMuted, setShowMuted] = useState(false)

  const critical = active.filter(i => i.type === 'critical')
  const warnings = active.filter(i => i.type === 'warning')
  const info = active.filter(i => i.type === 'info')
  const muted = [...snoozedItems, ...dismissedItems]

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

      {active.length === 0 && muted.length > 0 && (
        <div className="bg-surface border border-success/20 rounded-xl p-4 flex items-center gap-3 mb-2">
          <CheckCircle size={16} className="text-success-ink flex-shrink-0" />
          <div className="text-sm text-ink-secondary">You're all caught up — everything below is snoozed or dismissed.</div>
        </div>
      )}

      <div className="space-y-2">
        {active.map(item => (
          <ActionItem
            key={item.id}
            item={item}
            members={members}
            muted={false}
            onDismiss={() => dismiss(item.id)}
            onSnooze={(days) => snooze(item.id, days)}
          />
        ))}
      </div>

      {muted.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowMuted(s => !s)}
            className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink-muted transition-colors"
          >
            {showMuted ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Snoozed & dismissed ({muted.length})
          </button>
          {showMuted && (
            <div className="space-y-2 mt-2">
              {muted.map(item => (
                <ActionItem
                  key={item.id}
                  item={item}
                  members={members}
                  muted
                  mutedLabel={snoozeUntil(item.id) ? `snoozed until ${fmtDate(snoozeUntil(item.id))}` : 'dismissed'}
                  onRestore={() => restore(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
