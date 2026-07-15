import { useMemo, useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { simulate } from '../../engines/whatIf'
import PageHeader from '../shared/PageHeader'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'
import DateField from '../shared/DateField'
import IssuerLogo from '../shared/IssuerLogo'
import { inp } from '../shared/Field'
import { CheckCircle, XCircle, AlertTriangle, FlaskConical, Plus, X } from 'lucide-react'

const ISSUER_SUGGESTIONS = ['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover']

const STATUS_CELL = {
  safe: 'bg-success/15 text-success-ink',
  warning: 'bg-warning/15 text-warning-ink',
  blocked: 'bg-danger/15 text-danger-ink',
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

function TimelineStrip({ label, rows }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] text-ink-tertiary mb-1">{label}</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1 min-w-max" role="list" aria-label={`${label} — 5/24 count by month`}>
          {rows.map(row => {
            const [y, m] = row.ym.split('-').map(Number)
            const isJan = m === 1
            return (
              <div key={row.ym} role="listitem" className="flex flex-col items-center w-9 flex-shrink-0">
                <span className={`text-[9px] ${isJan ? 'text-ink-secondary font-semibold' : 'text-ink-faint'}`}>
                  {isJan ? y : monthLabel(row.ym)}
                </span>
                <span
                  title={`${monthLabel(row.ym)} ${y}: ${row.count}/24${row.dropOffs.length ? ` — ${row.dropOffs.join(', ')} leaves the window` : ''}${row.hypoAdds.length ? ` — +${row.hypoAdds.join(', ')}` : ''}`}
                  className={`mt-0.5 w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold tabular-nums ${STATUS_CELL[row.status]} ${row.hypoAdds.length ? 'ring-1 ring-accent/60' : ''}`}
                >
                  {row.count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function SimulatorView() {
  const { state } = useChurn()
  const members = state.members ?? []
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [hypos, setHypos] = useState([])
  const [draft, setDraft] = useState({ issuer: '', product: '', date: new Date().toISOString().slice(0, 10), isBusiness: false })

  const sim = useMemo(
    () => (memberId ? simulate(state, memberId, hypos, 24) : null),
    [state, memberId, hypos]
  )

  const memberCards = (state.creditCards ?? []).filter(c => c.memberId === memberId && c.openDate)
  const hasContent = memberCards.length > 0 || hypos.length > 0

  function addHypo() {
    if (!draft.issuer.trim() && !draft.product.trim()) return
    if (!draft.date) return
    setHypos(h => [...h, { ...draft, id: crypto.randomUUID(), issuer: draft.issuer.trim(), product: draft.product.trim() }])
    setDraft(d => ({ ...d, product: '' }))
  }

  function removeHypo(id) {
    setHypos(h => h.filter(x => x.id !== id))
  }

  const dropOffSchedule = (sim?.timeline ?? [])
    .filter(r => r.dropOffs.length > 0)
    .map(r => ({ ym: r.ym, dropOffs: r.dropOffs, after: null }))
  // Attach the count after the drop (next month's count)
  if (sim) {
    for (const d of dropOffSchedule) {
      const idx = sim.timeline.findIndex(r => r.ym === d.ym)
      d.after = sim.timeline[idx + 1]?.count ?? null
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <PageHeader title="What-if Simulator" />
      <p className="text-xs text-ink-muted -mt-4">
        Test future applications against Chase 5/24 and issuer velocity rules before anyone hits apply. Nothing here is saved — it's a scratchpad.
      </p>

      {/* Member selector */}
      <div className="flex gap-2 flex-wrap">
        {members.map(p => (
          <button
            key={p.id}
            onClick={() => { setMemberId(p.id); setHypos([]) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              memberId === p.id ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Hypothetical builder */}
      <section className="bg-surface border border-edge rounded-xl p-4">
        <h2 className="text-sm font-semibold text-ink mb-3">Planned applications</h2>
        {hypos.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {hypos.map(h => (
              <li key={h.id} className="flex items-center gap-2 bg-raised/60 rounded-lg px-2.5 py-1.5 text-sm">
                <IssuerLogo name={h.issuer || h.product} size={20} />
                <span className="text-ink font-medium truncate">{h.product || h.issuer}</span>
                {h.product && h.issuer && <span className="text-xs text-ink-tertiary">{h.issuer}</span>}
                {h.isBusiness && <span className="text-[10px] text-ink-tertiary bg-raised rounded px-1 py-0.5">biz</span>}
                <span className="text-xs text-ink-tertiary ml-auto tabular-nums">{h.date}</span>
                <button onClick={() => removeHypo(h.id)} aria-label={`Remove ${h.product || h.issuer}`} className="text-ink-faint hover:text-danger-ink transition-colors">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-end">
          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Issuer</label>
            <input list="sim-issuers" className={inp} value={draft.issuer} onChange={e => setDraft(d => ({ ...d, issuer: e.target.value }))} placeholder="Chase" />
            <datalist id="sim-issuers">
              {ISSUER_SUGGESTIONS.map(i => <option key={i} value={i} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Product <span className="text-ink-faint">(optional)</span></label>
            <input className={inp} value={draft.product} onChange={e => setDraft(d => ({ ...d, product: e.target.value }))} placeholder="Sapphire Preferred" onKeyDown={e => { if (e.key === 'Enter') addHypo() }} />
          </div>
          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Date</label>
            <DateField value={draft.date} onChange={v => setDraft(d => ({ ...d, date: v }))} />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer pb-2.5 whitespace-nowrap">
            <input type="checkbox" checked={draft.isBusiness} onChange={e => setDraft(d => ({ ...d, isBusiness: e.target.checked }))} />
            Business
          </label>
          <Button variant="primary" onClick={addHypo} disabled={(!draft.issuer.trim() && !draft.product.trim()) || !draft.date} className="mb-0.5">
            <Plus size={13} />
            Add
          </Button>
        </div>
        <p className="text-[11px] text-ink-faint mt-2">Business cards don't use a 5/24 slot but do count for issuer velocity rules.</p>
      </section>

      {!hasContent ? (
        <EmptyState
          icon={FlaskConical}
          title="Nothing to simulate yet"
          hint="This member has no dated cards. Add open dates to their cards, or add a planned application above, to project 5/24 and issuer velocity windows."
        />
      ) : (
        <>
          {/* Verdicts per planned application */}
          {sim?.verdicts?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-ink">Verdicts</h2>
              {sim.verdicts.map(({ hypo, verdicts }) => (
                <div key={hypo.id} className="bg-surface border border-edge rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <IssuerLogo name={hypo.issuer || hypo.product} size={22} />
                    <span className="text-sm font-semibold text-ink">{hypo.product || hypo.issuer}</span>
                    <span className="text-xs text-ink-tertiary ml-auto tabular-nums">{hypo.date}</span>
                  </div>
                  <div className="space-y-1.5">
                    {verdicts.map(v => {
                      const Icon = !v.ok ? XCircle : v.caution ? AlertTriangle : CheckCircle
                      const cls = !v.ok ? 'text-danger-ink' : v.caution ? 'text-warning-ink' : 'text-success-ink'
                      return (
                        <div key={v.rule} className="flex items-start gap-2 text-xs">
                          <Icon size={13} className={`${cls} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                          <span className="text-ink-secondary"><span className="font-medium text-ink">{v.rule}:</span> {v.reason}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 5/24 projection */}
          <section>
            <h2 className="text-base font-semibold text-ink mb-1">Chase 5/24 — next 24 months</h2>
            <p className="text-[11px] text-ink-tertiary mb-3">Counts are evaluated at the 1st of each month. Cells outlined in blue gain a planned application that month.</p>
            <div className="bg-surface border border-edge rounded-xl p-4">
              {hypos.length > 0 && <TimelineStrip label="With planned apps" rows={sim.timeline} />}
              <TimelineStrip label={hypos.length > 0 ? "Today's cards only" : '5/24 count'} rows={sim.baseline} />
              <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-tertiary">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success/30" /> under 4</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning/30" /> at 4 — one slot left</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-danger/30" /> 5+ — Chase blocked</span>
              </div>
            </div>
          </section>

          {/* Drop-off schedule */}
          {dropOffSchedule.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-ink mb-3">When cards leave the 24-month window</h2>
              <ul className="bg-surface border border-edge rounded-xl divide-y divide-edge">
                {dropOffSchedule.map(d => {
                  const [y, m] = d.ym.split('-').map(Number)
                  return (
                    <li key={d.ym} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="text-ink font-medium w-24 flex-shrink-0 tabular-nums">
                        {new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-ink-secondary min-w-0 truncate">{d.dropOffs.join(', ')} leaves 5/24</span>
                      {d.after != null && <span className="text-xs text-ink-tertiary ml-auto flex-shrink-0">→ {d.after}/24</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
