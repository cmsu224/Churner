export function getChase524Status(playerId, allCreditCards) {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 24)

  const playerCards = (allCreditCards ?? []).filter(c => c.playerId === playerId)
  const inWindow = playerCards.filter(c => {
    if (!c.isPrimary) return false
    if (!c.applicationDate) return false
    return new Date(c.applicationDate) >= cutoff
  })

  const count = inWindow.length
  let status = 'safe'
  if (count >= 5) status = 'blocked'
  else if (count === 4) status = 'warning'

  return { count, cards: inWindow, status, slotsRemaining: Math.max(0, 5 - count) }
}
