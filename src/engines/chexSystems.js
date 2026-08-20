// ChexSystems — the bank-account equivalent of Chase 5/24.
//
// ChexSystems is the consumer reporting agency most US banks pull when you
// apply for a checking or savings account. Two things on that report gate a
// bank bonus run, and neither is visible from any single account:
//
//   1. INQUIRIES. Every application at a bank that pulls ChexSystems leaves a
//      hard inquiry. Inquiries stay on the report for FIVE YEARS, but banks
//      look at a much shorter recent window. Stack too many too fast and the
//      "Chex-sensitive" banks (Chase, Citi, U.S. Bank, PNC, TD, Huntington,
//      Fifth Third, M&T, Santander, BMO…) start auto-denying — regardless of
//      how clean the rest of your file is.
//   2. CLOSED-ACCOUNT HISTORY. A closed account stays visible for five years
//      too, which is how the banks whose offer terms read "no open or closed
//      account with us in the past N months" actually enforce that. Those
//      banks are the ones flagged `basis: 'close'` in bankEligibility.js.
//
// This engine owns (1). It counts openings as inquiry proxies — the app tracks
// accounts you opened, not applications you were denied for, so the count is a
// FLOOR: any denial you didn't log is an inquiry the report has and this
// doesn't. The widget says so.
//
// Only openings at banks that actually pull ChexSystems count. A Fidelity or
// Schwab cash-management account is a brokerage application and normally
// leaves no ChexSystems inquiry at all, so it does not spend a slot.

import { getBankRule } from './bankEligibility'
import { getIssuerMeta } from '../utils/issuers'
import { parseDay, startOfToday, daysBetweenDays } from '../utils/format'

// ChexSystems retains inquiries (and closed-account records) for five years.
export const CHEX_RETENTION_YEARS = 5

// Rolling windows, with the inquiry count at which applications start getting
// denied. These are the community's working numbers, not published bank
// policy — no bank states a threshold — so they are deliberately conservative
// and flagged as estimates everywhere they surface.
//
// The 6-month window is the one banks actually weight, which is why it's the
// headline. Chex-SENSITIVE banks tighten well inside it: the widely-repeated
// guidance is to stay at or under ~4 inquiries in 6 months before applying at
// one, so that gets its own limit rather than being buried in the general one.
export const CHEX_WINDOWS = [
  { key: 'w6',  months: 6,  limit: 6,  label: '6 months',  primary: true },
  { key: 'w12', months: 12, limit: 12, label: '12 months' },
  { key: 'w24', months: 24, limit: 20, label: '24 months' },
]

export const SENSITIVE_LIMIT = { months: 6, limit: 4 }

function windowStatus(count, limit) {
  if (count >= limit) return 'blocked'
  if (count >= limit - 1) return 'warning'
  return 'safe'
}

function monthsAgo(months) {
  const d = startOfToday()
  d.setMonth(d.getMonth() - months)
  return d
}

// Does opening an account at this bank leave a ChexSystems inquiry?
export function pullsChex(bankName) {
  return (getBankRule(bankName).chex ?? 'standard') !== 'none'
}

// One member's ChexSystems picture.
//
// `inquiries` is every Chex-pulling account opening still inside the five-year
// retention window, newest first, each with the date it drops off the report.
// `windows` carries the rolling counts; `sensitive` is the tighter count that
// governs whether a Chex-sensitive bank will say yes today.
export function getChexStatus(memberId, allBankAccounts) {
  const today = startOfToday()
  const retentionCutoff = new Date(today)
  retentionCutoff.setFullYear(retentionCutoff.getFullYear() - CHEX_RETENTION_YEARS)

  const inquiries = (allBankAccounts ?? [])
    .filter(a => a.memberId === memberId)
    .map(acct => {
      const opened = parseDay(acct.openedDate)
      if (!opened || opened < retentionCutoff) return null
      const rule = getBankRule(acct.bankName)
      const chex = rule.chex ?? 'standard'
      if (chex === 'none') return null
      const meta = getIssuerMeta(acct.bankName)
      const dropsOff = new Date(opened)
      dropsOff.setFullYear(dropsOff.getFullYear() + CHEX_RETENTION_YEARS)
      return {
        accountId: acct.id,
        memberId,
        key: meta.key,
        bankName: acct.bankName || meta.name,
        accountType: acct.accountType ?? null,
        status: acct.status ?? null,
        openedDate: opened.toISOString(),
        opened,
        chex,
        sensitive: chex === 'sensitive',
        dropsOffDate: dropsOff.toISOString(),
        daysUntilDrop: daysBetweenDays(today, dropsOff),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.opened - a.opened)

  const windows = CHEX_WINDOWS.map(w => {
    const cutoff = monthsAgo(w.months)
    const inWindow = inquiries.filter(i => i.opened >= cutoff)
    return {
      ...w,
      cutoff: cutoff.toISOString(),
      count: inWindow.length,
      inquiries: inWindow,
      status: windowStatus(inWindow.length, w.limit),
      remaining: Math.max(0, w.limit - inWindow.length),
    }
  })

  const sensitiveCutoff = monthsAgo(SENSITIVE_LIMIT.months)
  const sensitiveInWindow = inquiries.filter(i => i.opened >= sensitiveCutoff)
  const sensitive = {
    ...SENSITIVE_LIMIT,
    count: sensitiveInWindow.length,
    status: windowStatus(sensitiveInWindow.length, SENSITIVE_LIMIT.limit),
    remaining: Math.max(0, SENSITIVE_LIMIT.limit - sensitiveInWindow.length),
  }

  const primary = windows.find(w => w.primary) ?? windows[0]

  // When the primary window is full, the date it stops being full: the oldest
  // inquiry in it ages out and frees a slot.
  const oldestInPrimary = primary.inquiries[primary.inquiries.length - 1]
  let nextSlotDate = null
  if (primary.count >= primary.limit && oldestInPrimary) {
    const d = new Date(oldestInPrimary.opened)
    d.setMonth(d.getMonth() + primary.months)
    nextSlotDate = d.toISOString()
  }

  return {
    memberId,
    inquiries,
    total: inquiries.length,
    windows,
    primary,
    sensitive,
    nextSlotDate,
    status: primary.status,
    retentionYears: CHEX_RETENTION_YEARS,
  }
}
