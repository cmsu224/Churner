import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { useActionItems } from '../../hooks/useActionItems'
import ActionQueue from './ActionQueue'
import PlayerSummaryCard from './PlayerSummaryCard'
import SpendProgress from './SpendProgress'
import CreditAgeSection from './CreditAgeSection'
import EligibilitySection from './EligibilitySection'
import { fmt$ } from '../../utils/format'
import { CheckCircle, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react'

const LS_ORDER = 'churner_dash_order'
// Default order per the requested layout: summary first, then eligibility,
// then card usage, then action items. Stats and spend challenges follow.
const DEFAULT_ORDER = ['summary', 'eligibility', 'usage', 'spend', 'actions', 'stats']

const SECTION_LABELS = {
  stats: 'Stats',
  summary: 'Individual Summary',
  eligibility: 'Application Eligibility',
  usage: 'Credit Age & Usage',
  spend: 'Active Spend Challenges',
  actions: 'Action Items',
}

function loadOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_ORDER))
    if (Array.isArray(saved) && saved.length) {
      // keep only known keys, then append any new ones that didn't exist when saved
      const known = saved.filter(k => DEFAULT_ORDER.includes(k))
      const missing = DEFAULT_ORDER.filter(k => !known.includes(k))
      return [...known, ...missing]
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

export default function DashboardView() {
  const { state } = useChurn()
  const { active: actionItems } = useActionItems()
  const [order, setOrder] = useState(loadOrder)
  const [customizing, setCustomizing] = useState(false)

  const activeCards = (state.creditCards ?? []).filter(c => c.status !== 'Closed' && c.status !== 'Downgraded')
  const activeAccounts = (state.bankAccounts ?? []).filter(a => a.status !== 'Closed')

  const cashPipeline =
    (state.creditCards ?? [])
      .filter(c => !c.bonusReceived && c.bonusType === 'cashback' && (c.bonusValue ?? 0) > 0)
      .reduce((s, c) => s + (c.bonusValue ?? 0), 0) +
    (state.bankAccounts ?? [])
      .filter(a => !a.bonusReceivedDate && (a.bonusAmount ?? 0) > 0)
      .reduce((s, a) => s + (a.bonusAmount ?? 0), 0)

  const pendingSpend = (state.creditCards ?? []).filter(c => {
    if (c.status === 'Closed' || c.status === 'Downgraded') return false
    return (c.spendRequirement ?? 0) > 0 && (c.currentSpend ?? 0) < (c.spendRequirement ?? 0)
  })

  const isEmpty = (state.creditCards ?? []).length === 0 && (state.bankAccounts ?? []).length === 0

  function persist(next) {
    setOrder(next)
    try { localStorage.setItem(LS_ORDER, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function move(key, dir) {
    const i = order.indexOf(key)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  function resetOrder() { persist(DEFAULT_ORDER) }

  if (isEmpty) {
    return (
      <div className="p-4 max-w-5xl mx-auto text-center py-20 text-ink-tertiary">
        <div className="text-5xl mb-4">🏦</div>
        <div className="text-base font-medium text-ink-muted mb-1">Nothing tracked yet</div>
        <div className="text-sm">Add cards under Cards, add bank accounts under Accounts, or use Import to load data in bulk.</div>
      </div>
    )
  }

  const SECTIONS = {
    stats: (
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-edge-strong rounded-xl p-3 text-center">
          <div className="text-xs text-ink-tertiary mb-1">Cash Pipeline</div>
          <div className="text-lg font-bold text-success-ink">{fmt$(cashPipeline)}</div>
        </div>
        <div className="bg-surface border border-edge-strong rounded-xl p-3 text-center">
          <div className="text-xs text-ink-tertiary mb-1">Active Cards</div>
          <div className="text-lg font-bold text-ink">{activeCards.length}</div>
        </div>
        <div className="bg-surface border border-edge-strong rounded-xl p-3 text-center">
          <div className="text-xs text-ink-tertiary mb-1">Bank Accounts</div>
          <div className="text-lg font-bold text-ink">{activeAccounts.length}</div>
        </div>
      </div>
    ),
    summary: (
      <section>
        <h2 className="text-base font-semibold text-ink mb-3">Individual Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(state.members ?? []).map(player => (
            <PlayerSummaryCard key={player.id} player={player} />
          ))}
        </div>
      </section>
    ),
    eligibility: <EligibilitySection />,
    usage: <CreditAgeSection />,
    spend: pendingSpend.length > 0 ? (
      <section>
        <h2 className="text-base font-semibold text-ink mb-3">Active Spend Challenges</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingSpend.map(card => <SpendProgress key={card.id} card={card} />)}
        </div>
      </section>
    ) : null,
    actions: actionItems.length > 0 ? (
      <ActionQueue members={state.members ?? []} />
    ) : (
      <div className="bg-surface border border-success/20 rounded-xl p-5 flex items-center gap-3">
        <CheckCircle size={18} className="text-success-ink flex-shrink-0" />
        <div>
          <div className="text-sm font-semibold text-ink">You're all caught up</div>
          <div className="text-xs text-ink-muted mt-0.5">No urgent actions. Keep tracking spend and watching for annual fees.</div>
        </div>
      </div>
    ),
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Dashboard</h1>
        <button
          onClick={() => setCustomizing(c => !c)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            customizing ? 'bg-accent text-white' : 'bg-raised text-ink-muted hover:text-ink'
          }`}
        >
          <SlidersHorizontal size={13} />
          {customizing ? 'Done' : 'Customize'}
        </button>
      </div>

      {customizing && (
        <div className="bg-surface border border-accent/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-ink-muted">Drag order with the arrows — saved on this device.</span>
            <button onClick={resetOrder} className="text-xs text-accent-ink hover:underline">Reset</button>
          </div>
          <div className="space-y-1.5">
            {order.map((key, i) => (
              <div key={key} className="flex items-center justify-between bg-raised rounded-lg px-3 py-2">
                <span className="text-sm text-ink">{SECTION_LABELS[key]}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => move(key, -1)} disabled={i === 0} className="p-1 text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"><ChevronUp size={15} /></button>
                  <button onClick={() => move(key, 1)} disabled={i === order.length - 1} className="p-1 text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"><ChevronDown size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.map(key => {
        const el = SECTIONS[key]
        return el ? <div key={key}>{el}</div> : null
      })}
    </div>
  )
}
