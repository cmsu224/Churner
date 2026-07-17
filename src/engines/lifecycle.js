import { isRetired } from '../utils/statusMeta'

// Annual fee: posts each year on the anniversary of the fee anchor — the
// recorded "Annual Fee Post Date" when the user set one (statement fee dates
// often lag the open date), otherwise the open date.
// Cancel BEFORE it posts = no fee. Cancel WITHIN 30 days after = full refund.
export function getAnnualFeeInfo(card) {
  const anchor = card.feePostDate || card.openDate
  if (!anchor || !(card.annualFee > 0)) return null
  const open = new Date(anchor)
  const today = new Date()
  let feeDate = new Date(open)
  feeDate.setFullYear(today.getFullYear())
  // If this year's fee date is already >30 days in the past, jump to next year
  if (today - feeDate > 30 * 86400000) feeDate.setFullYear(today.getFullYear() + 1)
  const daysUntilFee = Math.ceil((feeDate - today) / 86400000)
  const inRefundWindow = daysUntilFee < 0 // fee already posted, within 30d?
  const refundDaysLeft = inRefundWindow ? 30 + daysUntilFee : null
  const refundDeadline = new Date(feeDate)
  refundDeadline.setDate(refundDeadline.getDate() + 30)
  return { feeDate: feeDate.toISOString(), daysUntilFee, inRefundWindow, refundDaysLeft, refundDeadline: refundDeadline.toISOString() }
}

// 12-month close shield — the card version of the bank 181-day clawback rule.
// Closing a card less than a year after opening risks the issuer clawing back
// the sign-up bonus (and sours the relationship). Safe = 365 days since open,
// once the bonus has actually been earned. Null for cards with no earned bonus
// and for retired (Closed/Downgraded) cards.
export function getCardCloseShield(card) {
  if (!card?.bonusReceived || isRetired(card)) return null
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

export function getCardNextStatus(card) {
  if (!card) return null
  const { status, openDate } = card
  // Only age-based suggestions — bonus-received transition is handled by quick-action buttons
  if (status === 'Bonus Met' && openDate) {
    const months = monthsDiff(new Date(openDate), new Date())
    if (months >= 11) return 'Downgrade/Close Due'
  }
  return null
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
