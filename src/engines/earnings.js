// Earnings / ROI analytics engine. Pure functions only — no React.
//
// Valuation rule: a card bonus's realized $ value is
//   cashback  → bonusValue (already a $ figure)
//   points/miles → bonusCashValue if the user set one, otherwise
//                  bonusValue * (settings.pointValueCents ?? 1) / 100
// The points/miles fallback is an estimate of what the points are worth, so it
// carries `estimated: true` whenever bonusCashValue is absent and the bonus
// isn't cashback (points/miles valued off the household's default cents-per-point).

function cardValuation(card, settings) {
  const bonusValue = card.bonusValue ?? 0
  if (card.bonusType === 'cashback') return { value: bonusValue, estimated: false }
  if (card.bonusCashValue != null) return { value: card.bonusCashValue, estimated: false }
  const cents = settings?.pointValueCents ?? 1
  return { value: (bonusValue * cents) / 100, estimated: true }
}

// Number of full anniversaries of `openDate` that have elapsed by `endDate`
// (e.g. opened 2025-01-15, endDate 2026-07-15 → 1 anniversary — 2026-01-15 — has passed).
function anniversariesPassed(openDate, endDate) {
  let years = endDate.getFullYear() - openDate.getFullYear()
  const anniv = new Date(openDate)
  anniv.setFullYear(openDate.getFullYear() + years)
  if (anniv > endDate) years -= 1
  return Math.max(0, years)
}

// Fee-counting rule (estimate — issuers vary, this is a reasonable default):
// the annual fee posts at card-open for "year 1" and again on each anniversary
// the card stays open. So the number of fee postings by `endDate` is
//   (anniversaries elapsed) + 1  — the +1 is the fee charged at open —
//   minus 1 if feeWaivedFirstYear is set (no year-1 fee).
// A card opened 100 days ago with a $95 fee, not waived, and no anniversary
// reached yet → 0 anniversaries + 1 posting = $95 paid. A card opened
// 2025-01-15 with a $95 fee, not waived, as of 2026-07-15 → 1 anniversary
// (2026-01-15) + 1 = 2 postings = $190 paid.
function computeFeesPaid(card) {
  if (!(card.annualFee > 0) || !card.openDate) return 0
  const open = new Date(card.openDate)
  const end = card.closedDate ? new Date(card.closedDate) : new Date()
  if (end < open) return 0
  const passed = anniversariesPassed(open, end)
  const postings = passed + 1 - (card.feeWaivedFirstYear ? 1 : 0)
  return Math.max(0, postings) * card.annualFee
}

export function getCardEarnings(card, settings) {
  const { value, estimated } = cardValuation(card, settings)
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
    const d = new Date(row.realizedDate)
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
      const y = new Date(r.realizedDate).getFullYear()
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
    const y = new Date(r.realizedDate).getFullYear()
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
    const idx = monthIndex.get(ymKey(new Date(r.realizedDate)))
    if (idx == null) continue // outside the 24-month window
    const bucket = monthly[idx]
    bucket.total += r.realized
    bucket.byMember[r.memberId] = (bucket.byMember[r.memberId] ?? 0) + r.realized
  }

  const anyEstimated = cardRows.some(r => r.bonusReceived && r.estimated)

  return { perMember, household, efficiency, monthly, anyEstimated }
}
