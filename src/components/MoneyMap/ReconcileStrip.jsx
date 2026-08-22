import { useChurn } from '../../store/ChurnContext'
import { fmt$0 } from '../../utils/format'
import { round2 } from '../../engines/moneyFlow'
import NodeGlyph from './NodeGlyph'
import { Scale, ArrowRight } from 'lucide-react'

// Shown only when the ledger and a stored balance disagree. A churned account
// starts empty, so once its pushes are logged the transfers know what it should
// hold; a gap means a hand-typed figure, back-filled history, or interest the
// bank paid.
//
// Either number can be right, and so can both — an account that already held
// money before you logged your first push is over by exactly that much and
// always will be. So the strip states both figures and offers both fixes: take
// the ledger's number, or tell it what the account started with. It never
// assumes the balance is the wrong one, because "correct the balance" is the
// destructive answer of the two.

export default function ReconcileStrip({ rows }) {
  const { dispatch } = useChurn()
  if (!rows.length) return null

  return (
    <div className="bg-surface border border-warning/40 rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-edge">
        <Scale size={14} className="text-warning-ink flex-shrink-0" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">
          {rows.length} balance{rows.length === 1 ? '' : 's'} the transfers don&rsquo;t agree with
        </h2>
      </div>
      <div className="divide-y divide-edge">
        {rows.map(({ node, balance, ledger, delta, opening }) => (
          <div key={node.key} className="px-4 py-2.5 space-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <NodeGlyph node={node} size={20} className="text-ink-tertiary" />
              <span className="text-sm font-medium text-ink min-w-0 truncate">
                {node.name}
                <span className="text-ink-tertiary font-normal"> {node.sublabel}</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex items-center gap-2 text-xs tabular-nums sm:flex-1 min-w-0 flex-wrap">
                <span className="text-ink-muted">
                  account says <strong className="text-ink font-semibold">{fmt$0(balance)}</strong>
                </span>
                <ArrowRight size={11} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
                <span className="text-ink-muted">
                  transfers say <strong className="text-warning-ink font-semibold">{fmt$0(ledger)}</strong>
                </span>
                <span className="text-ink-faint">({delta > 0 ? '+' : ''}{fmt$0(delta)})</span>
              </span>

              <span className="flex items-center gap-1.5 flex-shrink-0 flex-wrap sm:justify-end">
                {/* The non-destructive fix, offered first: the balance is right
                    and the account simply wasn't empty when the ledger began. */}
                <button
                  onClick={() => dispatch({
                    type: 'UPDATE_ACCOUNT',
                    payload: { ...node.account, openingBalance: round2(opening + delta) },
                  })}
                  title={`Record that ${node.name} already held ${fmt$0(opening + delta)} before your first logged push — the balance stays as it is`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-raised text-ink-secondary border border-edge-strong hover:text-ink hover:border-accent/40 transition-colors"
                >
                  It started with {fmt$0(opening + delta)}
                </button>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...node.account, currentBalance: ledger } })}
                  title={`Overwrite the stored balance with the ledger's figure — ${fmt$0(Math.abs(delta))} ${delta > 0 ? 'comes off' : 'goes on'}`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-warning/15 text-warning-ink border border-warning/30 hover:bg-warning/25 transition-colors"
                >
                  Use {fmt$0(ledger)}
                </button>
              </span>
            </div>

            {opening !== 0 && (
              <p className="text-[11px] text-ink-tertiary tabular-nums">
                Counting {fmt$0(opening)} it already held when you started logging pushes.
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-tertiary">
        Interest, fees, or spending the bank did on its own explain a small gap — leave those alone. A gap the size of a whole push usually
        means a transfer is missing from the ledger, or landed without being marked. If the account simply wasn&rsquo;t empty the day you
        started logging, say so with <strong className="text-ink-secondary font-medium">It started with</strong> — that keeps the money.
      </div>
    </div>
  )
}
