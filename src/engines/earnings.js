// Earnings / ROI analytics engine. Pure functions only — no React.
//
// Valuation rule: a card bonus's realized $ value is
//   cashback  → bonusValue (already a $ figure)
//   points/miles → bonusValue * (the card's program ¢/pt rate) / 100
// The points/miles case is an estimate of what the points are worth, so it
// carries `estimated: true` whenever the bonus isn't cashback.

import { getCardProgram, resolvePointValueCents } from '../utils/programs'
import { getFeeRefundDays } from './lifecycle'

// Dollar value of a card's sign-up bonus, regardless of whether it's been
// received yet. Cashback is a $ figure already; points/miles use the card's
// program rate — the program is inferred from the card name/issuer, then valued
// at the user's per-program Settings rate (or the published default), falling
// back to the global fallback rate for unknown programs (see
// resolvePointValueCents). Rates are global per program — no per-card override —
// so the Cards page, Dashboard pipeline, and Earnings always agree. 130k Hilton
// points value at Hilton's rate, never a flat 1¢ or raw dollars.
export function valueCardBonus(card, settings) {
  const bonusValue = card.bonusValue ?? 0
  if (card.bonusType === 'cashback') return { value: bonusValue, estimated: false }
  const cents = resolvePointValueCents({ program: getCardProgram(card).name }, settings)
  return { value: (bonusValue * cents) / 100, estimated: true }
}

// Statuses where a card's bonus is no longer "in flight": Bonus Met means the
// bonus was earned even if the received checkbox wasn't ticked, and the rest
// aren't pursuing one. Only Applied / Active Churn (or legacy blank statuses)
// still count toward the pipeline.
const CARD_BONUS_DONE_STATUSES = ['Bonus Met', 'Keep Alive', 'Downgrade/Close Due', 'Closed', 'Downgraded']

// Shared pipeline predicate: is this card still working toward its bonus?
// Used by the Dashboard stats, member summaries, and the itemized Bonus
// Pipeline so every total agrees on what counts as money in flight.
export function isCardBonusPending(card) {
  return !card.bonusReceived
    && (card.bonusValue ?? 0) > 0
    && !CARD_BONUS_DONE_STATUSES.includes(card.status ?? '')
}

// Account statuses that are already past the bonus stage — a "Bonus Received"
// account counts as received even when no received date was recorded.
const ACCOUNT_BONUS_DONE_STATUSES = ['Bonus Received', 'Cooling Period', 'Safe to Close', 'Closed']

export function isAccountBonusPending(acct) {
  return !acct.bonusReceived
    && !acct.bonusReceivedDate
    && (acct.bonusAmount ?? 0) > 0
    && !ACCOUNT_BONUS_DONE_STATUSES.includes(acct.status ?? '')
}

// Fee-counting rule (estimate — issuers vary, this is a reasonable default):
// fees post yearly on the card's FEE ANCHOR — the recorded Annual Fee Post
// Date when set (statement fee dates often lag the open date), otherwise the
// open date, where the opening-day posting is the year-1 fee. Only postings
// whose date has actually passed count, so a second-year fee that hasn't hit
// yet isn't charged early. Adjustments:
//   - feeWaivedFirstYear skips the first posting
//   - the closed date stops the clock, and a posting the card was closed
//     within the issuer's refund window AFTER (getFeeRefundDays — 30d for most
//     issuers, longer for Citi/Capital One/Barclays; same rule the Annual Fee
//     tracker uses) is fully refunded, so it doesn't count either
function computeFeesPaid(card) {
  if (!(card.annualFee > 0) || !card.openDate) return 0
  const open = new Date(card.openDate)
  const end = card.closedDate ? new Date(card.closedDate) : new Date()
  if (end < open) return 0
  const anchor = card.feePostDate ? new Date(card.feePostDate) : open
  const refundDays = getFeeRefundDays(card)
  // First posting: the anchor's month/day in the opening year, or its next
  // occurrence if that falls before the open date itself.
  const first = new Date(anchor)
  first.setFullYear(open.getFullYear())
  if (first < open) first.setFullYear(first.getFullYear() + 1)
  let postings = 0
  for (const d = new Date(first); d <= end; d.setFullYear(d.getFullYear() + 1)) {
    if (card.closedDate && end - d <= refundDays * 86400000) continue // refunded on cancel
    postings++
  }
  if (card.feeWaivedFirstYear) postings -= 1
  return Math.max(0, postings) * card.annualFee
}

export function getCardEarnings(card, settings) {
  const { value, estimated } = valueCardBonus(card, settings)
  const realized = card.bonusReceived ? value : 0
  const realizedDate = card.bonusReceivedDate ?? null
  const feesPaid = computeFeesPaid(card)
  const net = realized - feesPaid
  const requiredSpend = card.spendRequirement ?? 0
  let daysToBonus = null
  if (card.openDate && card.bonusReceivedDate) {
    daysToBonus = Math.round((new Date(card.bonusReceivedDate) - new Date(card.openDate)) / 86400000)
  }
  return { realized, realizedDate, feesPaid, net, estimated, requiredSpend, daysToBonus }
}

export function getAccountEarnings(acct) {
  const received = !!acct.bonusReceived || !!acct.bonusReceivedDate
  const realized = received ? (acct.bonusAmount ?? 0) : 0
  const realizedDate = acct.bonusReceivedDate ?? null
  return { realized, realizedDate }
}

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// Parse a stored 'YYYY-MM-DD' date as LOCAL midnight. `new Date('2026-07-01')`
// parses as UTC, so in negative-UTC-offset timezones getMonth()/getFullYear()
// would report the previous day — pushing a 1st-of-month bonus into the wrong
// month bucket or a Jan-1 bonus into the prior year. Parsing the parts locally
// keeps period bucketing correct everywhere.
function parseLocalDate(str) {
  if (!str) return null
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function getEarningsSummary(state) {
  const members = state.members ?? []
  const cards = state.creditCards ?? []
  const accounts = state.bankAccounts ?? []
  const settings = state.settings ?? {}

  const now = new Date()
  const trailing12Cutoff = new Date(now)
  trailing12Cutoff.setMonth(trailing12Cutoff.getMonth() - 12)

  const cardRows = cards.map(card => ({
    memberId: card.memberId,
    bonusReceived: !!card.bonusReceived,
    ...getCardEarnings(card, settings),
  }))
  const acctRows = accounts.map(acct => ({
    memberId: acct.memberId,
    ...getAccountEarnings(acct),
  }))
  const allRows = [...cardRows, ...acctRows]

  function inTrailing12(row) {
    if (!row.realizedDate) return false
    const d = parseLocalDate(row.realizedDate)
    return d >= trailing12Cutoff && d <= now
  }

  // ── per-member ──────────────────────────────────────────────────────────
  const perMember = members.map(m => {
    const myCards = cardRows.filter(r => r.memberId === m.id)
    const myAccts = acctRows.filter(r => r.memberId === m.id)
    const myAll = [...myCards, ...myAccts]

    const bankTotal = myAccts.reduce((s, r) => s + r.realized, 0)
    const feesPaid = myCards.reduce((s, r) => s + r.feesPaid, 0)
    const cardNet = myCards.reduce((s, r) => s + r.net, 0)
    const lifetime = myAll.reduce((s, r) => s + r.realized, 0)
    const trailing12 = myAll.filter(inTrailing12).reduce((s, r) => s + r.realized, 0)

    const byYear = {}
    for (const r of myAll) {
      if (!r.realizedDate) continue // undated items count toward lifetime only
      const y = parseLocalDate(r.realizedDate).getFullYear()
      byYear[y] = (byYear[y] ?? 0) + r.realized
    }

    return { memberId: m.id, name: m.name, hex: m.hex, lifetime, trailing12, byYear, cardNet, bankTotal, feesPaid }
  })

  // ── household ───────────────────────────────────────────────────────────
  const householdLifetime = allRows.reduce((s, r) => s + r.realized, 0)
  const householdFeesPaid = cardRows.reduce((s, r) => s + r.feesPaid, 0)
  const householdTrailing12 = allRows.filter(inTrailing12).reduce((s, r) => s + r.realized, 0)
  const householdByYear = {}
  for (const r of allRows) {
    if (!r.realizedDate) continue
    const y = parseLocalDate(r.realizedDate).getFullYear()
    householdByYear[y] = (householdByYear[y] ?? 0) + r.realized
  }
  const household = {
    lifetime: householdLifetime,
    trailing12: householdTrailing12,
    byYear: householdByYear,
    feesPaid: householdFeesPaid,
    net: householdLifetime - householdFeesPaid,
  }

  // ── efficiency (card spend → bonus ratio; accounts have no spend requirement) ──
  const spendCards = cardRows.filter(r => r.bonusReceived && r.requiredSpend > 0)
  const totalRealizedForSpend = spendCards.reduce((s, r) => s + r.realized, 0)
  const totalRequiredSpend = spendCards.reduce((s, r) => s + r.requiredSpend, 0)
  const bonusPerDollarSpend = totalRequiredSpend > 0 ? totalRealizedForSpend / totalRequiredSpend : 0

  const daysRows = cardRows.filter(r => r.daysToBonus != null)
  const avgDaysToBonus = daysRows.length > 0
    ? Math.round(daysRows.reduce((s, r) => s + r.daysToBonus, 0) / daysRows.length)
    : null

  const completedBonuses = cardRows.filter(r => r.bonusReceived).length

  const efficiency = { bonusPerDollarSpend, avgDaysToBonus, completedBonuses }

  // ── monthly, last 24 months (gross realized bonuses; fees summarized separately) ──
  const monthly = []
  const monthIndex = new Map()
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = ymKey(d)
    monthIndex.set(ym, monthly.length)
    monthly.push({ ym, label: d.toLocaleDateString('en-US', { month: 'short' }), total: 0, byMember: {} })
  }
  for (const r of allRows) {
    if (!r.realizedDate || r.realized === 0) continue
    const idx = monthIndex.get(ymKey(parseLocalDate(r.realizedDate)))
    if (idx == null) continue // outside the 24-month window
    const bucket = monthly[idx]
    bucket.total += r.realized
    bucket.byMember[r.memberId] = (bucket.byMember[r.memberId] ?? 0) + r.realized
  }

  const anyEstimated = cardRows.some(r => r.bonusReceived && r.estimated)

  return { perMember, household, efficiency, monthly, anyEstimated }
}
