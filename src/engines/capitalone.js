// Capital One: typically 1 personal card per 6 months
export function getCapitalOneStatus(memberId, allCreditCards) {
  const now = new Date()
  const c1Cards = (allCreditCards ?? []).filter(c => {
    const iss = c.issuer?.toLowerCase() ?? ''
    return c.memberId === memberId && (iss.includes('capital one') || iss.includes('capitalone'))
  })

  const cutoff6m = new Date(now); cutoff6m.setMonth(cutoff6m.getMonth() - 6)
  const last6mo = c1Cards.filter(c => c.openDate && new Date(c.openDate) >= cutoff6m)

  let nextEligible = null
  if (last6mo.length > 0) {
    const sorted = [...last6mo].sort((a, b) => new Date(b.openDate) - new Date(a.openDate))
    const e = new Date(sorted[0].openDate); e.setMonth(e.getMonth() + 6)
    if (e > now) nextEligible = e.toISOString()
  }

  return {
    blocked: last6mo.length >= 1,
    last6mo,
    nextEligible,
    totalCards: c1Cards.length,
  }
}
