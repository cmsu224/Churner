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
