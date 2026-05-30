// Amex rules:
// - 1 new Amex card per 5 days
// - 2 new Amex cards per 90 days
// - Lifetime language: once per lifetime on many cards (tracked manually via bonusReceived history)
export function getAmexStatus(memberId, allCreditCards) {
  const now = new Date()
  const amexCards = (allCreditCards ?? []).filter(c => c.memberId === memberId && c.issuer?.toLowerCase().includes('amex'))

  const cutoff5d = new Date(now); cutoff5d.setDate(cutoff5d.getDate() - 5)
  const last5days = amexCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff5d)

  const cutoff90d = new Date(now); cutoff90d.setDate(cutoff90d.getDate() - 90)
  const last90days = amexCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff90d)

  const blocked5d = last5days.length >= 1
  const blocked90d = last90days.length >= 2

  const sorted = [...amexCards].filter(c => c.openDate).sort((a, b) => new Date(b.openDate) - new Date(a.openDate))
  let nextEligible5d = null, nextEligible90d = null
  if (sorted.length > 0) {
    const mostRecent = new Date(sorted[0].openDate)
    const e5 = new Date(mostRecent); e5.setDate(e5.getDate() + 6)
    if (e5 > now) nextEligible5d = e5.toISOString()
  }
  if (last90days.length >= 2) {
    const secondMost = new Date(last90days[1].openDate)
    const e90 = new Date(secondMost); e90.setDate(e90.getDate() + 91)
    if (e90 > now) nextEligible90d = e90.toISOString()
  }

  return {
    blocked: blocked5d || blocked90d,
    blocked5d, blocked90d,
    last5days, last90days,
    nextEligible5d, nextEligible90d,
    totalAmexCards: amexCards.length,
  }
}
