import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { getChase524Status } from '../../engines/chase524'
import { getAmexStatus } from '../../engines/amex'
import { getCitiStatus } from '../../engines/citi'
import { getBofAStatus } from '../../engines/bofa'
import { getCapitalOneStatus } from '../../engines/capitalone'
import { matchCardToRule, getCardReeligibility } from '../../engines/cardReeligibility'
import { getIssuerMeta } from '../../utils/issuers'
import { fmtDate } from '../../utils/format'

const TONE_ICON = { success: CheckCircle, warning: AlertTriangle, danger: XCircle }
const TONE_TEXT = { success: 'text-success-ink', warning: 'text-warning-ink', danger: 'text-danger-ink' }

function Row({ tone, children }) {
  const Icon = TONE_ICON[tone] ?? TONE_ICON.success
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon size={13} className={`flex-shrink-0 mt-0.5 ${TONE_TEXT[tone] ?? TONE_TEXT.success}`} />
      <span className="text-ink-secondary leading-snug">{children}</span>
    </div>
  )
}

// The next Chase slot opens 24mo after the OLDEST card currently inside the
// rolling window falls out of it.
function chaseNextSlotDate(cards) {
  const dated = (cards ?? []).filter(c => c.openDate)
  if (!dated.length) return null
  const oldest = dated.reduce((a, b) => (new Date(a.openDate) < new Date(b.openDate) ? a : b))
  const d = new Date(oldest.openDate)
  d.setMonth(d.getMonth() + 24)
  return d
}

// The "before you apply" check — live verdicts for Chase 5/24 (always, since
// it counts cards from every issuer), the issuer-specific velocity rule for
// whichever issuer is currently selected, and bonus re-eligibility for the
// specific product if it matches a known family.
export default function RuleCheckPanel({ memberId, issuer, product, state }) {
  const cards = state?.creditCards ?? []
  if (!memberId) return null

  const rows = []

  // Chase 5/24 — always shown.
  const chase = getChase524Status(memberId, cards)
  if (chase.status === 'blocked') {
    const next = chaseNextSlotDate(chase.cards)
    rows.push({
      tone: 'danger',
      text: `Chase 5/24: ${chase.count}/5 — blocked${next ? ` · next slot ~${fmtDate(next.toISOString())}` : ''}`,
    })
  } else if (chase.status === 'warning') {
    rows.push({ tone: 'warning', text: `Chase 5/24: ${chase.count}/5 — caution` })
  } else {
    rows.push({ tone: 'success', text: `Chase 5/24: ${chase.count}/5 ✓` })
  }

  // Issuer-specific velocity rules — only for the issuer being applied to.
  const issuerKey = getIssuerMeta(issuer).key

  if (issuerKey === 'amex') {
    const amex = getAmexStatus(memberId, cards)
    rows.push({
      tone: amex.blocked5d ? 'danger' : 'success',
      text: `Amex 1-per-5-days: ${amex.blocked5d ? `blocked — next eligible ${fmtDate(amex.nextEligible5d)}` : 'ok'}`,
    })
    rows.push({
      tone: amex.blocked90d ? 'danger' : 'success',
      text: `Amex 2-per-90-days: ${amex.blocked90d ? `blocked — next eligible ${fmtDate(amex.nextEligible90d)}` : 'ok'}`,
    })
  }

  if (issuerKey === 'citi') {
    const citi = getCitiStatus(memberId, cards)
    rows.push({
      tone: citi.blocked8d ? 'danger' : 'success',
      text: `Citi 1-per-8-days: ${citi.blocked8d ? `blocked — next eligible ${fmtDate(citi.nextEligible8d)}` : 'ok'}`,
    })
    rows.push({
      tone: citi.blocked65d ? 'danger' : 'success',
      text: `Citi 2-per-65-days: ${citi.blocked65d ? `blocked — next eligible ${fmtDate(citi.nextEligible65d)}` : 'ok'}`,
    })
  }

  if (issuerKey === 'bofa') {
    const bofa = getBofAStatus(memberId, cards)
    rows.push({ tone: bofa.rule_2mo.ok ? 'success' : 'danger', text: `BofA 2/2mo: ${bofa.rule_2mo.count}/${bofa.rule_2mo.max}` })
    rows.push({ tone: bofa.rule_12mo.ok ? 'success' : 'danger', text: `BofA 3/12mo: ${bofa.rule_12mo.count}/${bofa.rule_12mo.max}` })
    rows.push({ tone: bofa.rule_24mo.ok ? 'success' : 'danger', text: `BofA 4/24mo: ${bofa.rule_24mo.count}/${bofa.rule_24mo.max}` })
  }

  if (issuerKey === 'capitalone') {
    const c1 = getCapitalOneStatus(memberId, cards)
    rows.push({
      tone: c1.blocked ? 'danger' : 'success',
      text: `Capital One 1-per-6mo: ${c1.blocked ? `blocked — next eligible ${fmtDate(c1.nextEligible)}` : 'ok'}`,
    })
  }

  // Bonus re-eligibility — only relevant if this product matches a known
  // family AND the member has already earned a bonus in that family.
  const rule = product ? matchCardToRule({ cardName: product, issuer }) : null
  if (rule) {
    const entry = getCardReeligibility(memberId, cards).find(e => e.family === rule.family)
    if (entry) {
      if (entry.lifetime) {
        rows.push({ tone: 'danger', text: `Bonus re-eligibility (${rule.label}): once-per-lifetime — bonus already earned` })
      } else if (entry.eligible) {
        rows.push({ tone: 'success', text: `Bonus re-eligibility (${rule.label}): eligible ✓` })
      } else {
        rows.push({ tone: 'warning', text: `Bonus re-eligibility (${rule.label}): blocked until ${fmtDate(entry.eligibleDate)}` })
      }
    }
  }

  return (
    <div className="bg-raised/50 rounded-lg p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-ink-secondary">Before you apply</span>
        <span className="text-[10px] text-ink-faint">verify current terms on Doctor of Credit</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(r => <Row key={r.text} tone={r.tone}>{r.text}</Row>)}
      </div>
    </div>
  )
}
