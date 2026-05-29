// Annual fee: posts on the anniversary of openDate each year.
// Cancel BEFORE it posts = no fee. Cancel WITHIN 30 days after = full refund.
export function getAnnualFeeInfo(card) {
  if (!card.openDate || !(card.annualFee > 0)) return null
  const open = new Date(card.openDate)
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
  const { status, bonusReceived, openDate } = card
  if (status === 'Active Churn' && bonusReceived) return 'Bonus Met'
  if ((status === 'Bonus Met' || status === 'Retention Call Due') && openDate) {
    const months = monthsDiff(new Date(openDate), new Date())
    if (months >= 13) return 'Downgrade/Close Due'
    if (months >= 11) return 'Retention Call Due'
  }
  return null
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
