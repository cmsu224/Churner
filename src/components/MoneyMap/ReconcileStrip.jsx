import { useChurn } from '../../store/ChurnContext'
import { fmt$0 } from '../../utils/format'
import { Scale, ArrowRight } from 'lucide-react'

// Shown only when the ledger and a stored balance disagree. A churned account
// starts empty, so once its pushes are logged the transfers know what it should
// hold; a gap means a hand-typed figure, back-filled history, or interest the
// bank paid. Either number can be right, so the strip states both and lets you
// take the ledger's in one tap instead of guessing which page to trust.

export default function ReconcileStrip({ rows }) {
  const { dispatch } = useChurn()
  if (!rows.length) return null

  return (
    <div className="bg-surface border border-warning/40 rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-edge">
        <Scale size={14} className="text-warning-ink flex-shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">
          {rows.length} balance{rows.length === 1 ? "" : 's'} the transfers don&rsquo;t agree with
        </h2>
      </div>
      <div className="divide-y divide-edge">
        {rows.map(({ node, balance, ledger, delta }) => (
          <div key={node.key} className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
            <span className="text-sm font-medium text-ink min-w-0 truncate flex-1">
              {node.name}
              <span className="text-ink-tertiary font-normal"> {node.sublabel}</span>
            </span>
            <span className="flex items-center gap-2 text-xs tabular-nums">
              <span className="text-ink-muted">
                account says <strong className="text-ink font-semibold">{fmt$0(balance)}</strong>
              </span>
              <ArrowRight size={11} className="text-ink-faint" aria-hidden="true" />
              <span className="text-ink-muted">
                transfers say <strong className="text-warning-ink font-semibold">{fmt$0(ledger)}</strong>
              </span>
              <span className="text-ink-faint">({delta > 0 ? '+' : ''}{fmt$0(delta)})</span>
            </span>
            <button
              onClick={() => dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...node.account, currentBalance: ledger } })}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-warning/15 text-warning-ink border border-warning/30 hover:bg-warning/25 transition-colors flex-shrink-0"
            >
              Use {fmt$0(ledger)}
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-tertiary">
        Interest, fees, or spending the bank did on its own explain a small gap — leave those alone. A gap the size of a whole push usually
        means a transfer is missing from the ledger, or landed without being marked.
      </div>
    </div>
  )
}
