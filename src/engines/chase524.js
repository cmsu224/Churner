// Chase 5/24: you're typically denied a new Chase card if you've opened 5+
// PERSONAL credit cards (any issuer) in the last 24 months.
//
// What counts: every card opened in the rolling 24-month window EXCEPT
//  - business cards (most don't report to your personal bureau), and
//  - cards where you're only an authorized user (not the primary applicant).
// Everything else counts by default — you shouldn't have to hand-flag each
// card just to be counted.
export function getChase524Status(playerId, allCreditCards) {
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 24)
  const playerCards = (allCreditCards ?? []).filter(c => c.playerId === playerId)
  const inWindow = playerCards.filter(c => {
    if (!c.openDate) return false
    if (c.isBusiness) return false
    if (c.isAuthorizedUser) return false
    return new Date(c.openDate) >= cutoff
  })
  const count = inWindow.length
  let status = 'safe'
  if (count >= 5) status = 'blocked'
  else if (count === 4) status = 'warning'
  return { count, cards: inWindow, status, slotsRemaining: Math.max(0, 5 - count) }
}
