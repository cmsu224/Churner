import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getSpendDeadlineInfo } from '../../engines/lifecycle'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { AlertTriangle, X, Info } from 'lucide-react'
import { fmt$ } from '../../utils/format'

export default function AlertBanner() {
  const { state } = useChurn()
  const [dismissed, setDismissed] = useState(new Set())

  const alerts = []

  for (const card of (state.creditCards ?? [])) {
    if (card.status === 'Closed') continue
    const info = getSpendDeadlineInfo(card)
    if (info && !info.met && info.daysLeft >= 0 && info.daysLeft <= 14) {
      alerts.push({
        id: `spend-${card.id}`,
        severity: 'critical',
        message: `${card.cardName} ···${card.last4}: ${info.daysLeft}d left to meet ${fmt$(card.spendRequirement)} spend requirement`,
      })
    }
    if (!card.autoPayEnabled) {
      alerts.push({
        id: `autopay-${card.id}`,
        severity: 'warning',
        message: `AutoPay not enabled on ${card.cardName} ···${card.last4} — risk of interest charges`,
      })
    }
  }

  for (const acct of (state.bankAccounts ?? [])) {
    if (acct.status === 'Closed') continue
    const shield = getClawbackStatus(acct)
    if (shield.safe && acct.status !== 'Safe to Close') {
      alerts.push({
        id: `close-${acct.id}`,
        severity: 'info',
        message: `${acct.bankName} ···${acct.last4} is past Day 181 — safe to close now`,
      })
    }
  }

  for (const pmt of (state.externalPayments ?? [])) {
    if (!pmt.usePortal) {
      const card = (state.creditCards ?? []).find(c => c.id === pmt.cardId)
      alerts.push({
        id: `portal-${pmt.id}`,
        severity: 'warning',
        message: `External payment for ${card?.cardName ?? 'a card'}: use online portal, NOT bank bill-pay — fraud flag risk`,
      })
    }
  }

  const visible = alerts.filter(a => !dismissed.has(a.id))
  if (!visible.length) return null

  return (
    <div className="space-y-2 mb-4">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
            alert.severity === 'critical'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : alert.severity === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          {alert.severity === 'info'
            ? <Info size={15} className="flex-shrink-0 mt-0.5" />
            : <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          }
          <span className="flex-1">{alert.message}</span>
          <button
            onClick={() => setDismissed(d => new Set([...d, alert.id]))}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
