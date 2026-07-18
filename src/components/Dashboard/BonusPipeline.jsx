import { useNavigate } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { valueCardBonus, isCardBonusPending, isAccountBonusPending } from '../../engines/earnings'
import IssuerLogo from '../shared/IssuerLogo'
import PlayerBadge from '../shared/PlayerBadge'
import { fmt$, fmtPts } from '../../utils/format'

// The Dashboard's itemized "money in flight": every not-yet-received card and
// bank bonus as its own line, so the pipeline total is something you can see
// the parts of. Card points/miles are valued the same way the Earnings page
// does (per-program rate via valueCardBonus), flagged `est.` when estimated.
// Each row is a drill-down — it jumps to the card/account on its own page.
export default function BonusPipeline() {
  const { state } = useChurn()
  const navigate = useNavigate()
  const settings = state.settings ?? {}
  const members = state.members ?? []

  const cardRows = (state.creditCards ?? [])
    .filter(isCardBonusPending)
    .map(c => {
      const { value, estimated } = valueCardBonus(c, settings)
      return {
        id: `card-${c.id}`,
        name: c.cardName,
        logoName: c.issuer || c.cardName,
        memberId: c.memberId,
        value,
        estimated,
        raw: c.bonusType === 'cashback' ? null : { pts: c.bonusValue, unit: c.bonusType === 'miles' ? 'miles' : 'pts' },
        to: `/cards?highlight=${c.id}`,
      }
    })

  const bankRows = (state.bankAccounts ?? [])
    .filter(isAccountBonusPending)
    .map(a => ({
      id: `bank-${a.id}`,
      name: a.bankName,
      logoName: a.bankName,
      memberId: a.memberId,
      value: a.bonusAmount ?? 0,
      estimated: false,
      raw: null,
      to: `/accounts?highlight=${a.id}`,
    }))

  const rows = [...cardRows, ...bankRows].sort((a, b) => b.value - a.value)
  if (rows.length === 0) return null

  const total = rows.reduce((s, r) => s + r.value, 0)
  const anyEstimated = rows.some(r => r.estimated)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-ink">Bonus Pipeline</h2>
        <span className="text-sm font-bold text-success-ink tabular-nums">
          {fmt$(total)}
          {anyEstimated && <span className="text-warning-ink text-[10px] font-medium ml-0.5" title="Points/miles valued at their program rate">est.</span>}
        </span>
      </div>
      <div className="bg-surface border border-edge rounded-xl divide-y divide-edge overflow-hidden">
        {rows.map(r => (
          <button
            key={r.id}
            onClick={() => navigate(r.to)}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 hover:bg-raised/60 transition-colors"
          >
            <IssuerLogo name={r.logoName} size={26} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink truncate">{r.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PlayerBadge memberId={r.memberId} members={members} />
                {r.raw && <span className="text-[11px] text-ink-tertiary tabular-nums">{fmtPts(r.raw.pts)} {r.raw.unit}</span>}
              </div>
            </div>
            <div className="text-sm font-semibold text-success-ink tabular-nums flex-shrink-0">
              {fmt$(r.value)}
              {r.estimated && <span className="text-warning-ink text-[10px] font-medium ml-0.5">est.</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
