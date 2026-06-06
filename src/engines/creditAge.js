import { isRetired } from '../utils/statusMeta'

// Credit age & keep-alive engine.
// Length of credit history is ~15% of a FICO score, and issuers typically close
// cards after 12+ months of inactivity — which can shorten your history and drop
// your average age of accounts (AAoA). We track usage on EVERY open card so none
// of them silently go inactive. Oldest cards are flagged as highest priority.

const OLDEST_PRIORITY_COUNT = 3 // first N oldest cards get the highest-priority flag
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
  const dated = (cards ?? []).filter(c => !isRetired(c) && c.openDate)
  if (dated.length === 0) return { count: 0, aaoaMonths: 0, aaoaLabel: '—', oldest: null }
  const totalMonths = dated.reduce((s, c) => s + (getCardAge(c)?.totalMonths ?? 0), 0)
  const aaoaMonths = Math.round(totalMonths / dated.length)
  const years = Math.floor(aaoaMonths / 12)
  const months = aaoaMonths % 12
  const oldest = dated.slice().sort((a, b) => new Date(a.openDate) - new Date(b.openDate))[0]
  return { count: dated.length, aaoaMonths, aaoaLabel: ageLabel(years, months), oldest }
}

function usageStatusFor(dsu) {
  if (dsu === null) return 'unknown'
  if (dsu >= CRITICAL_DAYS) return 'critical'
  if (dsu >= WARN_DAYS) return 'warning'
  return 'ok'
}

// ALL open cards for a player, oldest first, each with age + usage status.
// The first OLDEST_PRIORITY_COUNT cards are flagged isOldest (highest priority).
export function getKeepAliveCards(playerCards) {
  const open = (playerCards ?? []).filter(c => !isRetired(c))
  // Dated cards sorted oldest-first, then undated cards at the end.
  const dated = open.filter(c => c.openDate).sort((a, b) => new Date(a.openDate) - new Date(b.openDate))
  const undated = open.filter(c => !c.openDate)
  const ordered = [...dated, ...undated]
  return ordered.map((card, i) => {
    const dsu = daysSinceUsed(card)
    return {
      card,
      age: getCardAge(card),
      daysSinceUsed: dsu,
      usageStatus: usageStatusFor(dsu),
      isOldest: card.openDate && i < OLDEST_PRIORITY_COUNT,
    }
  })
}

export { OLDEST_PRIORITY_COUNT, WARN_DAYS, CRITICAL_DAYS }
