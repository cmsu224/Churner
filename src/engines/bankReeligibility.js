// Bank bonus REAPPLY clock — the second of the two clocks a churned bank
// account runs on:
//
//   1. Clawback shield (clawbackShield.js) — 181 days from opening, after
//      which the bank can no longer reverse the bonus and the account is safe
//      to CLOSE.
//   2. Reapply eligibility (this engine) — once the account IS closed, how
//      long until the same bank will pay a new-account bonus again.
//
// Only CLOSED accounts get a reapply row. While an account is still open the
// first clock is the one that matters, and virtually every bank's offer terms
// disqualify current customers outright — so there is nothing to count down
// until the account is gone.
//
// The per-bank cooldown windows are deliberately NOT redefined here: the rule,
// its basis, and the anchor date all come from bankEligibility.js, so the
// Eligibility page's bank-level view and this per-account tracker can never
// disagree about a bank's rule.

import { getBankRule, getBonusAnchor, BASIS_LABEL } from './bankEligibility'
import { getIssuerMeta } from '../utils/issuers'
import { parseDay, startOfToday, daysBetweenDays } from '../utils/format'

export function isClosedAccount(account) {
  return account?.status === 'Closed'
}

// The reapply clock for ONE closed account.
//
// Returns null for an account that isn't closed — the reapply clock simply
// doesn't run yet. Pass `allAccounts` to get the `bankStillOpen` flag, which
// says the member holds another (non-closed) account at the same bank, so a
// "you can reapply" verdict would be premature no matter what the date math
// says.
export function getAccountReeligibility(account, allAccounts) {
  if (!isClosedAccount(account)) return null

  const meta = getIssuerMeta(account.bankName)
  const rule = getBankRule(account.bankName)
  const lifetime = rule.months === 0

  // The anchor follows the bank's own rule basis — from the last bonus, from
  // the day the account closed, or from the day it was opened — with the
  // fallback chain in getBonusAnchor covering accounts missing that date.
  const { date: anchorDate, from: anchorFrom } = getBonusAnchor(account, rule)

  const bankStillOpen = (allAccounts ?? []).some(a =>
    a.id !== account.id &&
    a.memberId === account.memberId &&
    !isClosedAccount(a) &&
    getIssuerMeta(a.bankName).key === meta.key
  )

  const base = {
    accountId: account.id,
    memberId: account.memberId,
    bankName: account.bankName || meta.name,
    key: meta.key,
    last4: account.last4 ?? null,
    accountType: account.accountType ?? null,
    bonusAmount: account.bonusAmount ?? null,
    openedDate: account.openedDate ?? null,
    closedDate: account.closedDate ?? null,
    anchor: anchorDate ? anchorDate.toISOString() : null,
    anchorFrom,
    anchorFromBonus: anchorFrom === 'bonus',
    anchorLabel: anchorFrom ? BASIS_LABEL[anchorFrom] : null,
    months: rule.months,
    basis: rule.basis ?? 'bonus',
    chex: rule.chex ?? 'standard',
    fallbackRule: !!rule.fallback,
    lifetime,
    note: rule.note,
    bankStillOpen,
  }

  if (lifetime) {
    return { ...base, state: 'lifetime', eligible: false, daysUntil: null,
      eligibleDate: null, pct: 100, message: 'Once per lifetime — no repeat bonus' }
  }
  if (!anchorDate) {
    return { ...base, state: 'unknown', eligible: false, daysUntil: null,
      eligibleDate: null, pct: 0, message: 'Add an opened date to track reapply eligibility' }
  }

  const eligibleDate = new Date(anchorDate)
  eligibleDate.setMonth(eligibleDate.getMonth() + rule.months)
  const today = startOfToday()
  const daysUntil = daysBetweenDays(today, eligibleDate)
  const total = Math.max(1, daysBetweenDays(anchorDate, eligibleDate))
  const pct = Math.min(100, Math.max(0, Math.round(((total - Math.max(0, daysUntil)) / total) * 100)))
  const eligible = daysUntil <= 0

  return {
    ...base,
    state: eligible ? 'eligible' : 'cooling',
    eligible,
    daysUntil: Math.max(0, daysUntil),
    eligibleDate: eligibleDate.toISOString(),
    pct,
    message: eligible
      ? 'Eligible to reapply now'
      : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} until you can reapply`,
  }
}

// Every closed account's reapply clock, action-ordered: what you can act on
// today first (eligible now), then the cooldowns by how soon they open, with
// lifetime bans and undated accounts last.
export function getClosedAccountReeligibility(allAccounts, memberId) {
  const accounts = (allAccounts ?? []).filter(a =>
    isClosedAccount(a) && (!memberId || a.memberId === memberId)
  )
  const rows = accounts
    .map(a => getAccountReeligibility(a, allAccounts))
    .filter(Boolean)

  const order = { eligible: 0, cooling: 1, lifetime: 2, unknown: 3 }
  return rows.sort((a, b) => {
    const d = order[a.state] - order[b.state]
    if (d !== 0) return d
    if (a.state === 'cooling') return a.daysUntil - b.daysUntil
    // Within a tier, most recently closed (then opened) first.
    return (parseDay(b.closedDate) ?? parseDay(b.openedDate) ?? 0) -
           (parseDay(a.closedDate) ?? parseDay(a.openedDate) ?? 0)
  })
}

// Collapse to one row per member + bank, keeping the LATEST anchor — that's
// the account whose cooldown actually binds. Used by the reminder feeds, so
// three closed Chase accounts produce one reminder, not three.
export function latestPerBank(rows) {
  const best = {}
  for (const row of rows ?? []) {
    const k = `${row.memberId}-${row.key}`
    const prev = best[k]
    if (!prev) { best[k] = row; continue }
    const a = row.anchor ? new Date(row.anchor) : null
    const p = prev.anchor ? new Date(prev.anchor) : null
    if (!p || (a && a > p)) best[k] = row
  }
  return Object.values(best)
}
