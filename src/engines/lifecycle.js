import { isRetired } from '../utils/statusMeta'
import { addDays, daysBetweenDays as daysBetween, parseDay, startOfToday } from '../utils/format'
import { daysSinceUsed, WARN_DAYS, CRITICAL_DAYS } from './creditAge'
import { getDebitProgress } from './debitCard'
import { getClawbackStatus } from './clawbackShield'
import { getMonthlyFeeStatus } from './monthlyFee'

// How many days after an annual fee posts you can cancel (or downgrade) and
// still get it refunded IN FULL. 30 days is the industry norm (Chase, Amex,
// US Bank — and the conservative default for issuers with no consistent
// policy, like Bank of America); verified longer windows: Citi 37d, Capital
// One 39d (cancellations — downgrades there are inconsistent), Barclays 60d.
// Sources: One Mile at a Time annual-fee refund-rules guide (Aug 2025),
// Doctor of Credit issuer refund rules.
const FEE_REFUND_DAYS = [
  ['citi', 37],
  ['capital one', 39],
  ['barclay', 60],
]

export function getFeeRefundDays(card) {
  const issuer = (card?.issuer ?? '').toLowerCase()
  for (const [key, days] of FEE_REFUND_DAYS) {
    if (issuer.includes(key)) return days
  }
  return 30
}

// Issuers bill the annual fee on the first STATEMENT that closes on or after
// the cycle date, not on the cycle date itself — so a fee routinely lands
// weeks late. One statement cycle plus a few days of processing slack is the
// window the app waits before calling a fee overdue.
export const STATEMENT_LAG_DAYS = 35
// Once a real post date has been confirmed, next year's posting lands on the
// same statement — only a few days of drift, not a whole cycle.
export const CONFIRMED_LAG_DAYS = 7

// Calendar-day math (parseDay / startOfToday / addDays / daysBetween) comes
// from utils/format so every engine and every rendered date agree on what day
// a stored 'YYYY-MM-DD' means. See the note there on UTC-midnight parsing.
function addYears(date, n) { const d = new Date(date); d.setFullYear(d.getFullYear() + n); return d }

// Annual fee: where this card is in its current fee cycle, and what can still
// be done about it.
//
// The fee does NOT post on the date the app can predict. Issuers bill it on the
// first statement closing on or after the cycle date — the open date for year
// one, the anniversary after that — so it can land up to a statement cycle
// late. The sign-up fee on a card opened last week almost certainly hasn't
// posted yet. So the engine never *assumes* a posting: it predicts a window and
// waits for the user to confirm the real date (the card's "Fee posted" button,
// stored as feePostDate). Only a CONFIRMED posting starts the
// cancel-for-full-refund clock, so the app can't claim "21 days left to cancel
// for a refund" on a fee that was never charged.
//
// Phases:
//   scheduled — the cycle date is still ahead; cancel before it and owe nothing
//   awaiting  — the cycle date passed with no confirmed posting: the fee is due
//               to hit any day (through expectedBy). No refund clock yet.
//   posted    — confirmed: feePostDate names this cycle, so inRefundWindow /
//               refundDaysLeft count from the date it actually hit.
//
// Confirming one posting also pins every later cycle to the real statement
// date, which is what makes the second year onward exact.
export function getAnnualFeeInfo(card) {
  if (!card || !(card.annualFee > 0)) return null
  const confirmedPost = parseDay(card.feePostDate)
  const openDate = parseDay(card.openDate)
  const anchor = confirmedPost ?? openDate
  if (!anchor) return null // fee set but no date to anchor the cycle on

  const refundDays = getFeeRefundDays(card)
  const today = startOfToday()
  const iso = (d) => d.toISOString()

  // A confirmed posting owns its cycle while it's still ahead or still
  // refundable — the one case where the refund countdown is real.
  if (confirmedPost) {
    const since = daysBetween(confirmedPost, today)
    if (since <= refundDays) {
      const posted = since >= 0
      const refundDeadline = addDays(confirmedPost, refundDays)
      return {
        phase: posted ? 'posted' : 'scheduled',
        confirmed: true,
        posted,
        awaitingPost: false,
        overdue: false,
        feeDate: iso(confirmedPost),
        expectedBy: iso(confirmedPost),
        daysUntilFee: -since,
        daysUntilExpectedBy: -since,
        daysAwaiting: 0,
        inRefundWindow: posted,
        refundDaysLeft: posted ? refundDays - since : null,
        refundDeadline: iso(refundDeadline),
        refundDeadlineLatest: iso(refundDeadline),
        refundDays,
        lagDays: 0,
        waivedFirstYear: false,
        lastPostedDate: posted ? iso(confirmedPost) : null,
        anchoredOnPostDate: true,
      }
    }
  }

  // Otherwise project the cycle forward from the anchor's month/day. A cycle is
  // live until even the latest posting it could produce has run out its refund
  // window; cycles covered by a first-year waiver are skipped outright.
  const lag = confirmedPost ? CONFIRMED_LAG_DAYS : STATEMENT_LAG_DAYS
  const waiverUntil = card.feeWaivedFirstYear && openDate ? addYears(openDate, 1) : null
  let cycle = new Date(anchor)
  let waived = false
  for (let guard = 0; guard < 120; guard++) {
    if (waiverUntil && cycle < waiverUntil) { cycle = addYears(cycle, 1); waived = true; continue }
    if (addDays(cycle, lag + refundDays) < today) { cycle = addYears(cycle, 1); continue }
    break
  }

  const expectedBy = addDays(cycle, lag)
  const daysUntilFee = daysBetween(today, cycle)
  const awaitingPost = daysUntilFee <= 0
  return {
    phase: awaitingPost ? 'awaiting' : 'scheduled',
    confirmed: false,
    posted: false,
    awaitingPost,
    // Past even the late end of the expected window and still unconfirmed —
    // either it slipped by unnoticed or the anchor date is wrong.
    overdue: awaitingPost && expectedBy < today,
    feeDate: iso(cycle),
    expectedBy: iso(expectedBy),
    daysUntilFee,
    daysUntilExpectedBy: daysBetween(today, expectedBy),
    daysAwaiting: awaitingPost ? -daysUntilFee : 0,
    inRefundWindow: false,
    refundDaysLeft: null,
    // Unconfirmed, so the deadline is a range: the earliest it could shut (fee
    // posts on the cycle date) is the safe one to plan against.
    refundDeadline: iso(addDays(cycle, refundDays)),
    refundDeadlineLatest: iso(addDays(expectedBy, refundDays)),
    refundDays,
    lagDays: lag,
    waivedFirstYear: waived,
    lastPostedDate: confirmedPost ? iso(confirmedPost) : null,
    anchoredOnPostDate: !!confirmedPost,
  }
}

// 12-month close shield — the card version of the bank 181-day clawback rule.
// Closing a card less than a year after opening risks the issuer clawing back
// the sign-up bonus (and sours the relationship). Safe = 365 days since open,
// once the bonus has actually been earned. A card in "Bonus Met" status counts
// as earned even when the received checkbox wasn't ticked — the same rule the
// pipeline uses. Null for cards with no earned bonus and for retired
// (Closed/Downgraded) cards.
export function getCardCloseShield(card) {
  const earned = card?.bonusReceived || card?.status === 'Bonus Met'
  if (!earned || isRetired(card)) return null
  const openDate = parseDay(card.openDate)
  if (!openDate) {
    return { safe: false, daysRemaining: null, safeDate: null, message: 'Set an open date to track when it’s safe to close' }
  }
  const safeDate = addDays(openDate, 365)
  const daysRemaining = daysBetween(startOfToday(), safeDate)
  const safe = daysRemaining <= 0
  const message = safe
    ? 'Safe to close — 1 year passed, bonus earned'
    : `Safe to close in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
  return { safe, daysRemaining: safe ? 0 : daysRemaining, safeDate: safeDate.toISOString(), message }
}

// Per-issuer bonus re-eligibility window (months since bonus received)
export function getReeligibilityInfo(card) {
  if (!card.bonusReceived) return null
  if (!card.openDate) return null
  const issuer = (card.issuer ?? '').toLowerCase()
  const cardNameL = (card.cardName ?? '').toLowerCase()
  let months = 24
  let note = '24 months (standard)'
  if (issuer.includes('amex')) {
    return { reeligible: false, note: 'Amex "once per lifetime" language — bonus typically not repeatable on same product. Verify on DoctorofCredit.' }
  } else if (issuer.includes('chase')) {
    if (cardNameL.includes('sapphire')) { months = 48; note = '48 months (Chase Sapphire family rule)' }
    else { months = 24; note = '24 months (Chase standard)' }
  } else if (issuer.includes('citi')) {
    months = 24; note = '24 months (Citi standard)'
  } else if (issuer.includes('capital one')) {
    months = 24; note = '24 months (Capital One standard)'
  }
  const fromDate = parseDay(card.bonusReceivedDate ?? card.openDate)
  if (!fromDate) return null
  const reeligibleDate = new Date(fromDate)
  reeligibleDate.setMonth(reeligibleDate.getMonth() + months)
  const daysUntil = daysBetween(startOfToday(), reeligibleDate)
  return { reeligible: daysUntil <= 0, daysUntil: Math.max(0, daysUntil), reeligibleDate: reeligibleDate.toISOString(), note, months }
}

export function getSpendDeadlineInfo(card) {
  if (!card?.openDate || !card?.spendDeadlineDays || !card?.spendRequirement) return null
  const openDate = parseDay(card.openDate)
  if (!openDate) return null
  const deadline = addDays(openDate, card.spendDeadlineDays ?? 90)
  const daysLeft = daysBetween(startOfToday(), deadline)
  const pct = card.spendRequirement > 0
    ? Math.min(100, Math.round(((card.currentSpend ?? 0) / card.spendRequirement) * 100))
    : 100
  return { deadline: deadline.toISOString(), daysLeft, pct, met: (card.currentSpend ?? 0) >= (card.spendRequirement ?? 0) }
}

// Spend progress toward a card's bonus requirement, whether or not the
// deadline is computable. The progress bar shouldn't vanish just because the
// open date or spend-window days haven't been entered — `deadline` is attached
// only when getSpendDeadlineInfo can compute one.
export function getSpendProgress(card) {
  const requirement = Number(card?.spendRequirement) || 0
  if (!(requirement > 0)) return null
  const spent = Number(card?.currentSpend) || 0
  const pct = Math.min(100, Math.round((spent / requirement) * 100))
  return { requirement, spent, pct, met: spent >= requirement, deadline: getSpendDeadlineInfo(card) }
}

// Infer the most appropriate status from a card's age and bonus configuration.
// Used when importing cards from a credit report (where bonus status is unknown)
// and when saving a manually-entered card whose status wasn't explicitly chosen.
export function getSmartCardStatus(card) {
  const openDate = parseDay(card.openDate)
  const hasBonus = Number(card.spendRequirement) > 0 || Number(card.bonusValue) > 0

  if (!openDate) {
    return { status: hasBonus ? 'Active Churn' : 'Keep Alive', bonusReceived: false }
  }

  const months = monthsDiff(openDate, new Date())

  if (!hasBonus) {
    // Points/perks card with no sign-up bonus — keep it alive
    return { status: 'Keep Alive', bonusReceived: false }
  }

  // Bonus card: map age to lifecycle stage
  if (months < 6)  return { status: 'Active Churn',        bonusReceived: false }
  if (months < 11) return { status: 'Bonus Met',            bonusReceived: true  }
  return               { status: 'Keep Alive',             bonusReceived: true  }
}

function monthsDiff(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// ── Attention score (the "Recommended" card order) ──────────────────────────
// Higher score = needs you sooner = sorted further up the list.
//
// The base tier comes from the card's lifecycle status: a card actively
// working a bonus outranks a long-term keep, and retired cards sink to the
// bottom. Urgency bumps are then added on top, and they're deliberately large
// enough to cross tiers — a keep-alive card that's drifted 6 months without a
// swipe (real inactivity-closure risk) should outrank a quiet Bonus Met card.
const STATUS_BASE = {
  'Active Churn':        600, // Earning Bonus — the clock is running
  'Applied':             550, // waiting on approval / just opened
  'Downgrade/Close Due': 500, // Cancel or Downgrade — a decision is owed
  'Bonus Met':           400, // Bonus Earned — watch the fee and the 12mo mark
  'Keep Alive':          200, // deliberate long-term hold
  'Downgraded':          100,
  'Closed':                0,
}

export function getCardAttentionScore(card) {
  if (!card) return 0
  let score = STATUS_BASE[card.status] ?? 300
  if (isRetired(card)) return score

  // Unmet spend requirement — the most time-sensitive thing a card can have.
  const si = getSpendDeadlineInfo(card)
  if (si && !si.met) {
    if (si.daysLeft < 0)       score += 400 // deadline blown, call the issuer
    else if (si.daysLeft <= 7) score += 350
    else if (si.daysLeft <= 30) score += 250
    else                        score += 100
  }

  // Annual fee — an open refund window is a hard deadline; an upcoming fee is
  // a retention-call opportunity.
  const fi = getAnnualFeeInfo(card)
  if (fi) {
    if (fi.inRefundWindow)             score += fi.refundDaysLeft !== null && fi.refundDaysLeft <= 5 ? 380 : 300
    else if (fi.daysUntilFee <= 7)     score += 260
    else if (fi.daysUntilFee <= 14)    score += 200
    else if (fi.daysUntilFee <= 45)    score += 120
  }

  // Dormancy — issuers close cards after prolonged inactivity, which shortens
  // credit history. This is the one thing that pulls a Keep Alive card up.
  const dsu = daysSinceUsed(card)
  if (dsu !== null) {
    if (dsu >= CRITICAL_DAYS)   score += 300
    else if (dsu >= WARN_DAYS)  score += 150
  }

  // Past the 12-month clawback shield with the bonus earned — free to act on.
  const cs = getCardCloseShield(card)
  if (cs?.safe) score += 80

  return score
}

// ── Attention score (the "Recommended" bank account order) ──────────────────
// Same idea as the card score: the status sets the tier, then deadlines add
// bumps big enough to cross tiers. An account still working its bonus
// outranks one on hold, closed accounts sink to the bottom.
const ACCOUNT_STATUS_BASE = {
  'Opened':         600, // requirements still to do
  'DD Linked':      580,
  'Bonus Pending':  500, // waiting on the bank to pay
  'Safe to Close':  450, // a decision is owed
  'Bonus Received': 350,
  'Cooling Period': 300, // holding through the clawback window
  'Closed':           0,
}

function deadlineBump(daysLeft) {
  if (daysLeft < 0)   return 400 // missed — call the bank
  if (daysLeft <= 7)  return 350
  if (daysLeft <= 30) return 250
  return 100
}

/** @param {any} account @param {{ transfers?: any[] }} [opts] */
export function getAccountAttentionScore(account, { transfers = [] } = {}) {
  if (!account) return 0
  let score = ACCOUNT_STATUS_BASE[account.status] ?? 300
  if (account.status === 'Closed') return score
  const bonusPaid = !!(account.bonusReceivedDate || account.bonusReceived)

  // Bonus requirements — the direct deposit and debit card deadlines. Only the
  // most urgent one counts, so two open requirements don't double up.
  let requirement = 0
  if (!bonusPaid && account.openedDate && !account.ddLinkedDate &&
      (account.ddsMade ?? 0) < (account.requiredDDCount ?? 1) &&
      (account.ddDeadlineDays > 0 || account.requiredDD > 0)) {
    const opened = parseDay(account.openedDate)
    if (opened) requirement = deadlineBump(daysBetween(startOfToday(), addDays(opened, account.ddDeadlineDays ?? 90)))
  }
  const debit = bonusPaid ? null : getDebitProgress(account)
  if (debit && !debit.met && debit.daysLeft !== null) {
    requirement = Math.max(requirement, deadlineBump(debit.daysLeft))
  }
  score += requirement

  // Whole-offer deadline with no bonus yet.
  if (!bonusPaid && parseDay(account.openedDate) && account.bonusDeadlineDays > 0) {
    const deadline = addDays(parseDay(account.openedDate), account.bonusDeadlineDays)
    const daysLeft = daysBetween(startOfToday(), deadline)
    if (daysLeft < 0) score += 400
    else if (daysLeft <= 14) score += 300
  }

  // Monthly fee that isn't waived this cycle yet.
  const fee = getMonthlyFeeStatus(account, { transfers })
  if (fee && fee.hasWaiver && !fee.waived) score += fee.daysLeft <= 7 ? 200 : 100

  // Bonus paid and past the 181-day clawback window — free to close.
  if (bonusPaid && getClawbackStatus(account).safe) score += 80

  return score
}

export function getAccountNextStatus(account) {
  if (!account) return null
  const { status, openedDate } = account
  if (status !== 'Bonus Received' && status !== 'Cooling Period') return null
  if (openedDate) {
    const safe = new Date(openedDate)
    safe.setDate(safe.getDate() + 181)
    if (new Date() >= safe) return 'Safe to Close'
  }
  return status === 'Bonus Received' ? 'Cooling Period' : null
}
