import { useState } from 'react'
import { getBankRuleList, BASIS_LABEL, CHEX_LABEL, DEFAULT_RULE } from '../../engines/bankEligibility'
import IssuerLogo from '../shared/IssuerLogo'
import { ChevronDown, ChevronUp, Landmark } from 'lucide-react'

const CHEX_TONE = {
  sensitive: 'text-warning-ink',
  standard:  'text-ink-muted',
  none:      'text-success-ink',
}

// Every bank cooldown the app knows, in one reference table — the answer to
// "how long is this one, and what does it count from?" without opening an
// account first. Banks with no entry aren't listed because they have no rule
// on file; they get the conservative default named in the footnote.
export default function BankRulesTable() {
  const [open, setOpen] = useState(false)
  const rules = getBankRuleList()
  const sensitive = rules.filter(r => r.chex === 'sensitive').length

  return (
    <div className="bg-surface border border-edge-strong rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 p-5 text-left hover:bg-raised/50 transition-colors"
      >
        <Landmark size={15} className="text-accent-ink flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-ink">Bank Bonus Rules</div>
          <div className="text-xs text-ink-muted">
            {rules.length} banks on file · {sensitive} Chex-sensitive
          </div>
        </div>
        <span className="text-ink-tertiary flex-shrink-0">{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</span>
      </button>

      {open && (
        <div className="border-t border-edge">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-faint border-b border-edge">
                  <th className="font-medium px-5 py-2">Bank</th>
                  <th className="font-medium px-3 py-2 whitespace-nowrap">Cooldown</th>
                  <th className="font-medium px-3 py-2 whitespace-nowrap">Counts from</th>
                  <th className="font-medium px-5 py-2 whitespace-nowrap">ChexSystems</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {rules.map(rule => (
                  <tr key={rule.key} className="hover:bg-raised/50 transition-colors align-top">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <IssuerLogo name={rule.name} size={18} />
                        <span className="text-ink font-medium whitespace-nowrap">{rule.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-ink-secondary">
                      {rule.months === 0
                        ? <span className="text-ink-tertiary">Once per lifetime</span>
                        : `${rule.months} months`}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted">
                      {rule.months === 0 ? '—' : BASIS_LABEL[rule.basis] ?? BASIS_LABEL.bonus}
                    </td>
                    <td className={`px-5 py-2 whitespace-nowrap ${CHEX_TONE[rule.chex] ?? CHEX_TONE.standard}`}>
                      {CHEX_LABEL[rule.chex] ?? CHEX_LABEL.standard}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-4 text-xs text-ink-faint">
            A bank not listed here has no rule on file and falls back to {DEFAULT_RULE.months} months from the last
            bonus, assuming a ChexSystems pull — conservative on purpose. Every window is a community estimate that
            banks revise without notice; confirm the offer&apos;s own terms on Doctor of Credit before applying.
          </p>
        </div>
      )}
    </div>
  )
}
