// Debit-card requirement — the third thing a bank bonus can ask for, next to
// the direct deposit and the balance floor: "make 10 debit card purchases
// within 90 days of opening". Offers word it three ways, and this engine
// tracks all of them because an offer that combines them only pays once EVERY
// part is met:
//   • a COUNT of qualifying purchases        — "10 debit card transactions"
//   • a per-purchase MINIMUM                 — "…of $5 or more each"
//   • a cumulative SPEND across those buys   — "…totaling $500"
//
// The per-purchase minimum is a qualifying rule, not a target: it decides which
// swipes count, so it's carried through to the reminders rather than summed.
//
// Fields on the account: requiredDebitCount, debitsMade, requiredDebitAmount
// (the per-purchase minimum), requiredDebitSpend, debitSpend, debitDeadlineDays,
// debitCompletedDate.

// Almost every offer runs the debit window on the same clock as the direct
// deposit, so an account that only recorded one window still gets a countdown.
// Preference order — the debit window first, then the direct-deposit window,
// then the whole offer's — and the readout always names which one it used, so a
// borrowed deadline never reads as one the user typed in.
const DEADLINE_SOURCES = [
  ['debitDeadlineDays', 'debit'],
  ['ddDeadlineDays', 'dd'],
  ['bonusDeadlineDays', 'bonus'],
]

export const DEADLINE_SOURCE_LABEL = {
  debit: 'debit-card window',
  dd: 'direct-deposit window',
  bonus: 'bonus window',
}

export function hasDebitRequirement(account) {
  return Number(account?.requiredDebitCount) > 0 || Number(account?.requiredDebitSpend) > 0
}

// Everything the app needs to say about an account's debit-card requirement,
// or null when the account doesn't have one. `met` is the whole requirement:
// the count AND the cumulative spend, when both were recorded.
export function getDebitProgress(account) {
  if (!account || !hasDebitRequirement(account)) return null

  const requiredCount = Math.max(0, Number(account.requiredDebitCount) || 0)
  const made = Math.max(0, Number(account.debitsMade) || 0)
  const countMet = requiredCount > 0 ? made >= requiredCount : true

  const requiredSpend = Math.max(0, Number(account.requiredDebitSpend) || 0)
  const spent = Math.max(0, Number(account.debitSpend) || 0)
  const spendMet = requiredSpend > 0 ? spent >= requiredSpend : true

  // Progress reports the BINDING half — 9 of 10 swipes done but only half the
  // required spend is 50% done, not 90%.
  const ratios = []
  if (requiredCount > 0) ratios.push(made / requiredCount)
  if (requiredSpend > 0) ratios.push(spent / requiredSpend)
  const pct = ratios.length ? Math.min(100, Math.round(Math.min(...ratios) * 100)) : 100

  let deadlineDays = null
  let deadlineFrom = null
  for (const [field, source] of DEADLINE_SOURCES) {
    if (Number(account[field]) > 0) { deadlineDays = Number(account[field]); deadlineFrom = source; break }
  }

  let deadline = null
  let daysLeft = null
  if (deadlineDays && account.openedDate) {
    const d = new Date(account.openedDate)
    d.setDate(d.getDate() + deadlineDays)
    deadline = d.toISOString()
    daysLeft = Math.ceil((d - new Date()) / 86400000)
  }

  const met = countMet && spendMet
  return {
    requiredCount,
    made,
    remainingCount: Math.max(0, requiredCount - made),
    countMet,
    // 0 when the offer never named one — "any purchase counts".
    perPurchaseMin: Math.max(0, Number(account.requiredDebitAmount) || 0),
    requiredSpend,
    spent,
    remainingSpend: Math.max(0, requiredSpend - spent),
    spendMet,
    met,
    pct,
    deadlineDays,
    deadline,
    deadlineFrom,
    daysLeft,
    overdue: !met && daysLeft !== null && daysLeft < 0,
    completedDate: account.debitCompletedDate || null,
  }
}

// One short line for the parts still outstanding — "7 more purchases · $320 to
// go". Shared by the account card, the money map and the action items so all
// three describe the same requirement the same way.
export function debitRemainingLabel(progress, { short = false } = {}) {
  if (!progress || progress.met) return ''
  const parts = []
  if (!progress.countMet) {
    const n = progress.remainingCount
    parts.push(short ? `${n} more debit` : `${n} more debit purchase${n === 1 ? '' : 's'}`)
  }
  if (!progress.spendMet) {
    const amount = Math.round(progress.remainingSpend).toLocaleString()
    parts.push(short ? `$${amount} to go` : `$${amount} more debit spend`)
  }
  return parts.join(' · ')
}
