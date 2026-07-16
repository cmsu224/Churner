// What-if eligibility simulator engine. Pure functions.
//
// The live issuer engines (chase524.js, amex.js, citi.js, bofa.js,
// capitalone.js) all evaluate "as of now", so this engine re-states the SAME
// thresholds as forward projections. The numbers below mirror those engines
// exactly — if a rule ever changes there, change it here too:
//   chase524.js     → 5 personal cards / 24 months (business + AU excluded)
//   amex.js         → 1 new Amex / 5 days, 2 / 90 days
//   citi.js         → 1 new Citi / 8 days, 2 / 65 days
//   bofa.js         → 2 / 2 months, 3 / 12 months, 4 / 24 months
//   capitalone.js   → 1 personal card / 6 months

const MS_DAY = 86400000

function issuerKeyOf(issuer) {
  const s = (issuer ?? '').toLowerCase()
  if (s.includes('amex') || s.includes('american express')) return 'amex'
  if (s.includes('citi')) return 'citi'
  if (s.includes('bank of america') || s.includes('bofa') || s.includes('boa')) return 'bofa'
  if (s.includes('capital one') || s.includes('capitalone')) return 'capitalone'
  if (s.includes('chase')) return 'chase'
  return 'other'
}

// A card/hypothetical counts toward 5/24 if it's a dated personal card where
// the member is the primary holder — same exclusions as chase524.js.
function counts524(entry) {
  if (!entry.openDate && !entry.date) return false
  if (entry.isBusiness) return false
  if (entry.isAuthorizedUser) return false
  return true
}

function entryDate(entry) {
  return new Date(entry.openDate ?? entry.date)
}

// Count of 5/24 slots used as of `asOf`: entries opened in the 24 months
// before that date (and not after it).
function count524At(entries, asOf) {
  const cutoff = new Date(asOf)
  cutoff.setMonth(cutoff.getMonth() - 24)
  return entries.filter(e => {
    if (!counts524(e)) return false
    const d = entryDate(e)
    return d > cutoff && d <= asOf
  })
}

function statusFor(count) {
  if (count >= 5) return 'blocked'
  if (count === 4) return 'warning'
  return 'safe'
}

// Month-by-month 5/24 projection for one member.
// `memberCards` = real cards (already filtered to the member),
// `hypotheticals` = [{ id, issuer, product, date, isBusiness }].
// Returns one row per month: { ym, date, count, status, dropOffs, hypoAdds }.
export function project524(memberCards, hypotheticals = [], monthsAhead = 24) {
  const real = (memberCards ?? []).filter(c => c.openDate)
  const hypos = (hypotheticals ?? []).filter(h => h.date)
  const all = [...real, ...hypos]

  const rows = []
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < monthsAhead; i++) {
    const evalDate = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const nextMonth = new Date(start.getFullYear(), start.getMonth() + i + 1, 1)
    const inWindow = count524At(all, evalDate)
    const count = inWindow.length

    // Cards leaving the window during this month (were in-window at the 1st,
    // out by next month's 1st).
    const nextWindow = new Set(count524At(all, nextMonth).map(e => e.id))
    const dropOffs = inWindow
      .filter(e => !nextWindow.has(e.id) && entryDate(e) <= evalDate)
      .map(e => e.cardName ?? e.product ?? 'card')

    const hypoAdds = hypos
      .filter(h => {
        const d = entryDate(h)
        return d.getFullYear() === evalDate.getFullYear() && d.getMonth() === evalDate.getMonth()
      })
      .map(h => h.product || h.issuer || 'application')

    rows.push({
      ym: `${evalDate.getFullYear()}-${String(evalDate.getMonth() + 1).padStart(2, '0')}`,
      date: evalDate.toISOString(),
      count,
      status: statusFor(count),
      dropOffs,
      hypoAdds,
    })
  }
  return rows
}

function inPriorDays(d, atDate, days) {
  const diff = (atDate - d) / MS_DAY
  return diff >= 0 && diff < days
}

function inPriorMonths(d, atDate, months) {
  const cutoff = new Date(atDate)
  cutoff.setMonth(cutoff.getMonth() - months)
  return d > cutoff && d <= atDate
}

// Velocity verdicts for ONE hypothetical application, evaluated at its date.
// Counts BOTH real cards and any EARLIER hypotheticals of the same issuer.
export function velocityVerdicts(memberCards, hypotheticals, hypo) {
  const atDate = new Date(hypo.date)
  const others = [
    ...(memberCards ?? []).filter(c => c.openDate),
    ...(hypotheticals ?? []).filter(h => h.id !== hypo.id && h.date && new Date(h.date) <= atDate),
  ]
  const key = issuerKeyOf(hypo.issuer)
  const verdicts = []

  // Chase 5/24 — always shown (every issuer's personal cards use slots, but
  // only a CHASE application is actually denied by being at 5/24).
  const count = count524At(others, atDate).length
  const after = count + (counts524(hypo) ? 1 : 0)
  const monthLabel = atDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  if (key === 'chase') {
    verdicts.push({
      rule: 'Chase 5/24',
      ok: count < 5,
      caution: count === 4,
      reason: count >= 5
        ? `Already at ${count}/24 in ${monthLabel} — Chase would deny this application.`
        : `${count}/24 at ${monthLabel}${counts524(hypo) ? ` → ${after}/24 after approval` : ''}.`,
    })
  } else {
    verdicts.push({
      rule: 'Chase 5/24',
      ok: true,
      caution: counts524(hypo) && after >= 5,
      reason: counts524(hypo)
        ? `Uses a 5/24 slot: ${count}/24 → ${after}/24 in ${monthLabel}${after >= 5 ? ' — Chase apps blocked until a slot frees up' : ''}.`
        : `Business/AU card — doesn't use a 5/24 slot (${count}/24 at ${monthLabel}).`,
    })
  }

  const issuerDates = others
    .filter(e => issuerKeyOf(e.issuer) === key)
    .map(entryDate)

  if (key === 'amex') {
    const in5d = issuerDates.filter(d => inPriorDays(d, atDate, 5)).length
    const in90d = issuerDates.filter(d => inPriorDays(d, atDate, 90)).length
    verdicts.push({ rule: 'Amex 1/5', ok: in5d < 1, reason: in5d >= 1 ? 'Another new Amex within the prior 5 days.' : 'No Amex opened in the prior 5 days.' })
    verdicts.push({ rule: 'Amex 2/90', ok: in90d < 2, reason: in90d >= 2 ? `${in90d} new Amex cards within the prior 90 days.` : `${in90d} of 2 Amex slots used in the prior 90 days.` })
  } else if (key === 'citi') {
    const in8d = issuerDates.filter(d => inPriorDays(d, atDate, 8)).length
    const in65d = issuerDates.filter(d => inPriorDays(d, atDate, 65)).length
    verdicts.push({ rule: 'Citi 1/8', ok: in8d < 1, reason: in8d >= 1 ? 'Another new Citi within the prior 8 days.' : 'No Citi opened in the prior 8 days.' })
    verdicts.push({ rule: 'Citi 2/65', ok: in65d < 2, reason: in65d >= 2 ? `${in65d} new Citi cards within the prior 65 days.` : `${in65d} of 2 Citi slots used in the prior 65 days.` })
  } else if (key === 'bofa') {
    const m2 = issuerDates.filter(d => inPriorMonths(d, atDate, 2)).length
    const m12 = issuerDates.filter(d => inPriorMonths(d, atDate, 12)).length
    const m24 = issuerDates.filter(d => inPriorMonths(d, atDate, 24)).length
    verdicts.push({ rule: 'BofA 2/2/3/12/4/24', ok: m2 < 2 && m12 < 3 && m24 < 4,
      reason: `${m2}/2 in 2mo · ${m12}/3 in 12mo · ${m24}/4 in 24mo at that date.` })
  } else if (key === 'capitalone') {
    const m6 = hypo.isBusiness ? 0 : issuerDates.filter(d => inPriorMonths(d, atDate, 6)).length
    verdicts.push({ rule: 'Capital One 1/6mo', ok: m6 < 1, reason: m6 >= 1 ? 'A Capital One card opened within the prior 6 months.' : 'No Capital One personal card in the prior 6 months.' })
  }

  return verdicts
}

// Full simulation for one member.
export function simulate(state, memberId, hypotheticals = [], monthsAhead = 24) {
  const memberCards = (state.creditCards ?? []).filter(c => c.memberId === memberId)
  const baseline = project524(memberCards, [], monthsAhead)
  const timeline = project524(memberCards, hypotheticals, monthsAhead)
  const verdicts = hypotheticals
    .filter(h => h.date)
    .map(h => ({ hypo: h, verdicts: velocityVerdicts(memberCards, hypotheticals, h) }))

  // First month the member is back under 5/24 (with hypotheticals) after any
  // blocked month.
  let nextSafeDate = null
  let seenBlocked = false
  for (const row of timeline) {
    if (row.status === 'blocked') seenBlocked = true
    else if (seenBlocked) { nextSafeDate = row.date; break }
  }

  return { baseline, timeline, verdicts, nextSafeDate }
}
