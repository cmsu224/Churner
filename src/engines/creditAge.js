// Credit age & keep-alive engine.
// Length of credit history is ~15% of a FICO score. Your OLDEST accounts anchor it.
// Issuers typically close cards after 12+ months of inactivity, which can shorten
// your history and drop your average age of accounts (AAoA). Keep the oldest few
// active with a small recurring charge.

const KEEP_ALIVE_COUNT = 3
const WARN_DAYS = 120   // nudge to use the card
const CRITICAL_DAYS = 180 // real risk of inactivity closure approaching

export function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export function getCardAge(card) {
  if (!card.openDate) return null
  const open = new Date(card.openDate)
  const now = new Date()
  const totalMonths = monthsBetween(open, now)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return { totalMonths, years, months, openDate: card.openDate, label: ageLabel(years, months) }
}

function ageLabel(years, months) {
  if (years === 0) return `${months}mo`
  if (months === 0) return `${years}y`
  return `${years}y ${months}mo`
}

export function daysSinceUsed(card) {
  if (!card.lastUsedDate) return null
  return Math.floor((new Date() - new Date(card.lastUsedDate)) / 86400000)
}

// Average Age of Accounts across a player's OPEN, dated cards.
export function getAccountAgeStats(cards) {
  const dated = (cards ?? []).filter(c => c.status !== 'Closed' && c.openDate)
  if (dated.length === 0) return { count: 0, aaoaMonths: 0, aaoaLabel: '—', oldest: null }
  const totalMonths = dated.reduce((s, c) => s + (getCardAge(c)?.totalMonths ?? 0), 0)
  const aaoaMonths = Math.round(totalMonths / dated.length)
  const years = Math.floor(aaoaMonths / 12)
  const months = aaoaMonths % 12
  const oldest = dated.slice().sort((a, b) => new Date(a.openDate) - new Date(b.openDate))[0]
  return { count: dated.length, aaoaMonths, aaoaLabel: ageLabel(years, months), oldest }
}

// The N oldest OPEN cards for a player — these should be kept alive.
export function getKeepAliveCards(playerCards) {
  const open = (playerCards ?? []).filter(c => c.status !== 'Closed' && c.openDate)
  const sorted = open.slice().sort((a, b) => new Date(a.openDate) - new Date(b.openDate))
  return sorted.slice(0, KEEP_ALIVE_COUNT).map(card => {
    const dsu = daysSinceUsed(card)
    let usageStatus = 'unknown'
    if (dsu !== null) {
      if (dsu >= CRITICAL_DAYS) usageStatus = 'critical'
      else if (dsu >= WARN_DAYS) usageStatus = 'warning'
      else usageStatus = 'ok'
    }
    return { card, age: getCardAge(card), daysSinceUsed: dsu, usageStatus }
  })
}

export { KEEP_ALIVE_COUNT, WARN_DAYS, CRITICAL_DAYS }
