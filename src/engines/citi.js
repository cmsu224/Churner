// Citi rules:
// - 1 new Citi card per 8 days
// - 2 new Citi cards per 65 days
export function getCitiStatus(playerId, allCreditCards) {
  const now = new Date()
  const citiCards = (allCreditCards ?? []).filter(c => c.playerId === playerId && c.issuer?.toLowerCase().includes('citi'))

  const cutoff8d = new Date(now); cutoff8d.setDate(cutoff8d.getDate() - 8)
  const cutoff65d = new Date(now); cutoff65d.setDate(cutoff65d.getDate() - 65)

  const last8days = citiCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff8d)
  const last65days = citiCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff65d)

  const blocked8d = last8days.length >= 1
  const blocked65d = last65days.length >= 2

  const sorted = [...citiCards].filter(c => c.openDate).sort((a, b) => new Date(b.openDate) - new Date(a.openDate))
  let nextEligible8d = null, nextEligible65d = null
  if (sorted.length > 0) {
    const e8 = new Date(sorted[0].openDate); e8.setDate(e8.getDate() + 9)
    if (e8 > now) nextEligible8d = e8.toISOString()
  }
  if (last65days.length >= 2) {
    const e65 = new Date(last65days[1].openDate); e65.setDate(e65.getDate() + 66)
    if (e65 > now) nextEligible65d = e65.toISOString()
  }

  return { blocked: blocked8d || blocked65d, blocked8d, blocked65d, last8days, last65days, nextEligible8d, nextEligible65d }
}
