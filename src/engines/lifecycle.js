import { isRetired } from '../utils/statusMeta'
import { daysSinceUsed, WARN_DAYS, CRITICAL_DAYS } from './creditAge'

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

// Annual fee: posts each year on the anniversary of the fee anchor — the
// recorded "Annual Fee Post Date" when the user set one (statement fee dates
// often lag the open date), otherwise the open date.
// Cancel BEFORE it posts = no fee. Cancel within the issuer's refund window
// after it posts (getFeeRefundDays) = full refund.
export function getAnnualFeeInfo(card) {
  const anchor = card.feePostDate || card.openDate
  if (!anchor || !(card.annualFee > 0)) return null
  const refundDays = getFeeRefundDays(card)
  const open = new Date(anchor)
  const today = new Date()
  let feeDate = new Date(open)
  feeDate.setFullYear(today.getFullYear())
  // If this year's fee date is already past its refund window, jump to next year
  if (today - feeDate > refundDays * 86400000) feeDate.setFullYear(today.getFullYear() + 1)
  const daysUntilFee = Math.ceil((feeDate - today) / 86400000)
  const inRefundWindow = daysUntilFee < 0 // fee already posted, refund clock running
  const refundDaysLeft = inRefundWindow ? refundDays + daysUntilFee : null
  const refundDeadline = new Date(feeDate)
  refundDeadline.setDate(refundDeadline.getDate() + refundDays)
  return { feeDate: feeDate.toISOString(), daysUntilFee, inRefundWindow, refundDaysLeft, refundDeadline: refundDeadline.toISOString(), refundDays }
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
  if (!card.openDate) {
    return { safe: false, daysRemaining: null, safeDate: null, message: 'Set an open date to track when it’s safe to close' }
  }
  const safeDate = new Date(card.openDate)
  safeDate.setDate(safeDate.getDate() + 365)
  const today = new Date()
  const daysRemaining = Math.ceil((safeDate - today) / 86400000)
  const safe = today >= safeDate
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
  const fromDate = new Date(card.bonusReceivedDate ?? card.openDate)
  const reeligibleDate = new Date(fromDate)
  reeligibleDate.setMonth(reeligibleDate.getMonth() + months)
  const daysUntil = Math.ceil((reeligibleDate - new Date()) / 86400000)
  return { reeligible: daysUntil <= 0, daysUntil: Math.max(0, daysUntil), reeligibleDate: reeligibleDate.toISOString(), note, months }
}

export function getSpendDeadlineInfo(card) {
  if (!card?.openDate || !card?.spendDeadlineDays || !card?.spendRequirement) return null
  const deadline = new Date(card.openDate)
  deadline.setDate(deadline.getDate() + (card.spendDeadlineDays ?? 90))
  const today = new Date()
  const daysLeft = Math.ceil((deadline - today) / 86400000)
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
  const openDate = card.openDate ? new Date(card.openDate) : null
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

export function getAccountNextStatus(account) {
  if (!account) return null
  const { status, openedDate } = account
  const today = new Date()
  if (status === 'Bonus Received') return 'Cooling Period'
  if ((status === 'Cooling Period' || status === 'Bonus Received') && openedDate) {
    const safe = new Date(openedDate)
    safe.setDate(safe.getDate() + 181)
    if (today >= safe) return 'Safe to Close'
  }
  return null
}
