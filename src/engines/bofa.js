// Bank of America 2/3/4 rule:
// - Max 2 BofA cards in last 2 months
// - Max 3 BofA cards in last 12 months
// - Max 4 BofA cards in last 24 months
export function getBofAStatus(playerId, allCreditCards) {
  const now = new Date()
  const bofaCards = (allCreditCards ?? []).filter(c => {
    const iss = c.issuer?.toLowerCase() ?? ''
    return c.playerId === playerId && (iss.includes('bank of america') || iss.includes('bofa') || iss.includes('boa'))
  })

  const cutoff2m = new Date(now); cutoff2m.setMonth(cutoff2m.getMonth() - 2)
  const cutoff12m = new Date(now); cutoff12m.setMonth(cutoff12m.getMonth() - 12)
  const cutoff24m = new Date(now); cutoff24m.setMonth(cutoff24m.getMonth() - 24)

  const last2mo = bofaCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff2m)
  const last12mo = bofaCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff12m)
  const last24mo = bofaCards.filter(c => c.openDate && new Date(c.openDate) >= cutoff24m)

  return {
    blocked: last2mo.length >= 2 || last12mo.length >= 3 || last24mo.length >= 4,
    last2mo, last12mo, last24mo,
    rule_2mo: { count: last2mo.length, max: 2, ok: last2mo.length < 2 },
    rule_12mo: { count: last12mo.length, max: 3, ok: last12mo.length < 3 },
    rule_24mo: { count: last24mo.length, max: 4, ok: last24mo.length < 4 },
  }
}
