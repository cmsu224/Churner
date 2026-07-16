import { fmt$ } from '../../utils/format'

// A compact balance indicator shown on every card and bank account.
// Zero balance = muted/green "nothing to track". Non-zero = highlighted so you
// can instantly spot which accounts still hold money / which cards owe a balance.
//
// kind="card"    → a balance you may need to pay down; if a creditLimit is set,
//                  the bar shows utilization.
// kind="account" → money parked for a bonus; non-zero is highlighted amber.
export default function BalanceBar({ balance = 0, limit = 0, kind = 'card' }) {
  const bal = Number(balance) || 0
  const lim = Number(limit) || 0
  const hasBalance = bal > 0

  let pct
  if (lim > 0) pct = Math.min(100, Math.round((bal / lim) * 100))
  else pct = hasBalance ? 35 : 0 // no limit known: show a token fill when non-zero

  // Colors
  let barColor, textColor, label
  if (!hasBalance) {
    barColor = 'bg-overlay'
    textColor = 'text-success-ink'
    label = kind === 'account' ? '$0 — empty' : '$0 — paid off'
  } else {
    const util = lim > 0 ? bal / lim : 0
    if (kind === 'card' && util >= 0.5) { barColor = 'bg-danger'; textColor = 'text-danger-ink' }
    else if (kind === 'card' && util >= 0.3) { barColor = 'bg-warning'; textColor = 'text-warning-ink' }
    else { barColor = 'bg-warning'; textColor = 'text-warning-ink' }
    label = lim > 0 ? `${fmt$(bal)} / ${fmt$(lim)} · ${pct}%` : fmt$(bal)
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-ink-tertiary">Balance</span>
        <span className={`font-medium ${textColor}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-raised rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
