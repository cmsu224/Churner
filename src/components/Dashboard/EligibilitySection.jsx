import { useChurn } from '../../store/ChurnContext'
import { getChase524Status } from '../../engines/chase524'
import { getAmexStatus } from '../../engines/amex'
import { getCitiStatus } from '../../engines/citi'
import { getBofAStatus } from '../../engines/bofa'
import { getCapitalOneStatus } from '../../engines/capitalone'
import { fmtDateShort } from '../../utils/format'

function chaseNextSlot(cards) {
  if (!cards?.length) return null
  const dated = cards.filter(c => c.openDate)
  if (!dated.length) return null
  const oldest = dated.sort((a, b) => new Date(a.openDate) - new Date(b.openDate))[0]
  const d = new Date(oldest.openDate)
  d.setMonth(d.getMonth() + 24)
  return d.toISOString()
}

function MiniBar({ value, max, blocked }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const color = blocked ? 'bg-red-500' : pct >= 0.8 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className={`text-xs font-mono flex-shrink-0 ${blocked ? 'text-red-400' : 'text-zinc-400'}`}>
        {value}/{max}
      </span>
    </div>
  )
}

function IssuerRow({ label, value, max, blocked, nextDate }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-zinc-500 w-24 flex-shrink-0">{label}</span>
      <MiniBar value={value} max={max} blocked={blocked} />
      {blocked && nextDate
        ? <span className="text-xs text-zinc-500 flex-shrink-0">next: {fmtDateShort(nextDate)}</span>
        : <span className="text-xs text-zinc-600 flex-shrink-0">{max - value} open</span>
      }
    </div>
  )
}

function PlayerEligibility({ player, allCards }) {
  const chase = getChase524Status(player.id, allCards)
  const amex  = getAmexStatus(player.id, allCards)
  const citi  = getCitiStatus(player.id, allCards)
  const bofa  = getBofAStatus(player.id, allCards)
  const c1    = getCapitalOneStatus(player.id, allCards)

  const rows = []

  if (chase.count > 0) {
    rows.push(
      <IssuerRow key="chase"
        label="Chase 5/24"
        value={chase.count} max={5}
        blocked={chase.status === 'blocked'}
        nextDate={chase.status === 'blocked' ? chaseNextSlot(chase.cards) : null}
      />
    )
  }

  if (amex.last90days.length > 0) {
    rows.push(
      <IssuerRow key="amex90"
        label="Amex 90-day"
        value={amex.last90days.length} max={2}
        blocked={amex.blocked90d}
        nextDate={amex.nextEligible90d}
      />
    )
  }
  if (amex.last5days.length > 0) {
    rows.push(
      <IssuerRow key="amex5"
        label="Amex 5-day"
        value={amex.last5days.length} max={1}
        blocked={amex.blocked5d}
        nextDate={amex.nextEligible5d}
      />
    )
  }

  if (citi.last65days.length > 0) {
    rows.push(
      <IssuerRow key="citi65"
        label="Citi 65-day"
        value={citi.last65days.length} max={2}
        blocked={citi.blocked65d}
        nextDate={citi.nextEligible65d}
      />
    )
  }
  if (citi.last8days.length > 0) {
    rows.push(
      <IssuerRow key="citi8"
        label="Citi 8-day"
        value={citi.last8days.length} max={1}
        blocked={citi.blocked8d}
        nextDate={citi.nextEligible8d}
      />
    )
  }

  if (bofa.rule_2mo.count > 0) {
    rows.push(<IssuerRow key="bofa2" label="BofA 2/2mo" value={bofa.rule_2mo.count} max={2} blocked={!bofa.rule_2mo.ok} nextDate={null} />)
  }
  if (bofa.rule_12mo.count > 0) {
    rows.push(<IssuerRow key="bofa12" label="BofA 3/12mo" value={bofa.rule_12mo.count} max={3} blocked={!bofa.rule_12mo.ok} nextDate={null} />)
  }
  if (bofa.rule_24mo.count > 0) {
    rows.push(<IssuerRow key="bofa24" label="BofA 4/24mo" value={bofa.rule_24mo.count} max={4} blocked={!bofa.rule_24mo.ok} nextDate={null} />)
  }

  if (c1.last6mo.length > 0) {
    rows.push(
      <IssuerRow key="c1"
        label="Capital One"
        value={c1.last6mo.length} max={1}
        blocked={c1.blocked}
        nextDate={c1.nextEligible}
      />
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.hex }} />
        <span className="font-semibold text-white text-sm">{player.name}</span>
      </div>
      <div>{rows}</div>
    </div>
  )
}

export default function EligibilitySection() {
  const { state } = useChurn()
  const players = state.members ?? []
  const allCards = state.creditCards ?? []

  const active = players.filter(p =>
    allCards.some(c => c.memberId === p.id && c.status !== 'Closed')
  )
  if (active.length === 0) return null

  // Only render the section if at least one player has something to show
  const panels = active
    .map(p => <PlayerEligibility key={p.id} player={p} allCards={allCards} />)
    .filter(Boolean)

  // We can't easily check "renders null" without extra state, so always render section
  // and rely on PlayerEligibility returning null to produce an empty grid
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-white">Application Eligibility</h2>
        <span className="text-xs text-zinc-500">Active issuer windows</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {panels}
      </div>
    </section>
  )
}
