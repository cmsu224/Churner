// Monthly maintenance fee — the cost of holding an account open after the
// bonus posts. You can't always empty a churned account during the 181-day
// clawback hold: most checking accounts charge a monthly fee unless you keep a
// balance floor, get a direct deposit every statement cycle, or both.
//
// Fields on the account:
//   monthlyFee          — the fee in dollars (0 / empty = no fee to dodge)
//   feeWaiverBalance    — balance that waives the fee
//   feeWaiverDD         — total direct deposit per cycle that waives the fee
//                         ($1 = any direct deposit counts)
//   feeWaiverDebitCount — debit card purchases per cycle that waive the fee
//   feeWaiverDebitAmount— minimum per purchase for it to count (optional)
//   feeWaiverMode       — 'any' (one waiver is enough, the default) or 'all'
//   feeCycleDay         — day of month the fee cycle ends (empty = month end)
//   feeWaiverDDLog      — ['YYYY-MM', …] cycles the waiver deposit was logged
//   feeWaiverDebitLog   — ['YYYY-MM', …] cycles the waiver swipes were logged
//
// A Money Map direct-deposit push that lands inside the cycle for at least the
// waiver amount also counts, so logging the transfer is enough.

import { parseDay, startOfToday, daysBetweenDays } from '../utils/format'
import { splitNodeKey } from './moneyFlow'

// ACH pushes take 1–3 business days to land, so reminders ask for the money
// to be sent this many days before the cycle ends.
export const FEE_SEND_LEAD_DAYS = 5

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function cycleEndIn(year, month, cycleDay) {
  const last = new Date(year, month + 1, 0).getDate()
  const day = cycleDay >= 1 ? Math.min(cycleDay, last) : last
  return new Date(year, month, day)
}

// The statement cycle that contains `onDay` — its first and last day.
export function getFeeCycle(account, onDay = startOfToday()) {
  const cycleDay = Math.floor(Number(account?.feeCycleDay) || 0)
  let end = cycleEndIn(onDay.getFullYear(), onDay.getMonth(), cycleDay)
  if (end < onDay) end = cycleEndIn(onDay.getFullYear(), onDay.getMonth() + 1, cycleDay)
  const prevEnd = cycleEndIn(end.getFullYear(), end.getMonth() - 1, cycleDay)
  const start = new Date(prevEnd)
  start.setDate(start.getDate() + 1)
  return { start, end, key: `${end.getFullYear()}-${pad(end.getMonth() + 1)}` }
}

export function hasMonthlyFee(account) {
  return Number(account?.monthlyFee) > 0
}

// Direct-deposit pushes into this account that landed inside the cycle.
function ddTransfersInCycle(account, transfers, cycle) {
  return (transfers ?? []).filter(t => {
    if (t.purpose !== 'dd') return false
    const to = splitNodeKey(t.toKey)
    if (!to || to.kind !== 'account' || to.id !== account.id) return false
    const day = parseDay(t.landedDate)
    return !!day && day >= cycle.start && day <= cycle.end
  })
}

// Everything the app needs to say about the monthly fee on one account, or
// null when the account has no fee or is closed.
/** @param {any} account @param {{ transfers?: any[], today?: Date }} [opts] */
export function getMonthlyFeeStatus(account, { transfers = [], today = startOfToday() } = {}) {
  if (!account || account.status === 'Closed' || !hasMonthlyFee(account)) return null

  const fee = Number(account.monthlyFee)
  const balanceRequired = Math.max(0, Number(account.feeWaiverBalance) || 0)
  const ddRequired = Math.max(0, Number(account.feeWaiverDD) || 0)
  const debitRequired = Math.max(0, Math.floor(Number(account.feeWaiverDebitCount) || 0))
  const debitMinAmount = Math.max(0, Number(account.feeWaiverDebitAmount) || 0)
  const mode = account.feeWaiverMode === 'all' ? 'all' : 'any'
  const cycle = getFeeCycle(account, today)
  const daysLeft = daysBetweenDays(today, cycle.end)

  const sendBy = new Date(cycle.end)
  sendBy.setDate(sendBy.getDate() - FEE_SEND_LEAD_DAYS)

  const balance = Number(account.currentBalance) || 0
  const balanceOk = balanceRequired > 0 ? balance >= balanceRequired : null
  const shortfall = balanceRequired > 0 ? Math.max(0, Math.round((balanceRequired - balance) * 100) / 100) : 0

  let ddDone = null
  let ddSource = null
  if (ddRequired > 0) {
    if ((account.feeWaiverDDLog ?? []).includes(cycle.key)) {
      ddDone = true
      ddSource = 'log'
    } else {
      const pushed = ddTransfersInCycle(account, transfers, cycle)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      ddDone = pushed >= ddRequired
      ddSource = ddDone ? 'transfer' : null
    }
  }

  const debitDone = debitRequired > 0 ? (account.feeWaiverDebitLog ?? []).includes(cycle.key) : null

  const checks = [balanceOk, ddDone, debitDone].filter(v => v !== null)
  const hasWaiver = checks.length > 0
  const waived = hasWaiver && (mode === 'all' ? checks.every(Boolean) : checks.some(Boolean))

  return {
    fee,
    balanceRequired,
    balance,
    balanceOk,
    shortfall,
    ddRequired,
    ddDone,
    ddSource,
    debitRequired,
    debitMinAmount,
    debitDone,
    mode,
    hasWaiver,
    waived,
    cycleKey: cycle.key,
    cycleStart: iso(cycle.start),
    cycleEnd: iso(cycle.end),
    sendBy: iso(sendBy),
    daysLeft,
    daysToSend: daysBetweenDays(today, sendBy),
    monthLabel: cycle.end.toLocaleDateString('en-US', { month: 'short' }),
  }
}

// "Keep $1,500 in the account or get a $500 direct deposit" — the rule itself,
// in one line.
export function feeRuleLabel(status) {
  if (!status) return ''
  const parts = []
  if (status.balanceRequired > 0) parts.push(`keep $${status.balanceRequired.toLocaleString()} in the account`)
  if (status.ddRequired > 0) parts.push(feeDDLabel(status))
  if (status.debitRequired > 0) parts.push(feeDebitLabel(status))
  if (!parts.length) return `No way to skip it recorded — this account costs $${status.fee}/month`
  return parts.join(status.mode === 'all' ? ' and ' : ' or ')
}

// "get $500 in direct deposits" — $1 or less means any deposit counts.
export function feeDDLabel(status) {
  return status.ddRequired <= 1
    ? 'get any direct deposit'
    : `get $${status.ddRequired.toLocaleString()} in direct deposits`
}

// "make 10 debit card purchases of $5+"
export function feeDebitLabel(status) {
  const n = status.debitRequired
  return `make ${n} debit card purchase${n === 1 ? '' : 's'}${status.debitMinAmount > 0 ? ` of $${status.debitMinAmount.toLocaleString()}+` : ''}`
}

function toggleLog(log, cycleKey) {
  return log.includes(cycleKey)
    ? log.filter(k => k !== cycleKey)
    : [...log, cycleKey].sort().slice(-24)
}

// Toggle this cycle's "waiver deposit done" mark. Returns the new log.
export function toggleFeeDDLog(account, cycleKey) {
  return toggleLog(account.feeWaiverDDLog ?? [], cycleKey)
}

// Toggle this cycle's "waiver swipes done" mark. Returns the new log.
export function toggleFeeDebitLog(account, cycleKey) {
  return toggleLog(account.feeWaiverDebitLog ?? [], cycleKey)
}

// Future cycles (including the current one if not waived) for the calendar
// and phone reminders.
/** @param {any} account @param {{ transfers?: any[], count?: number, today?: Date }} [opts] */
export function upcomingFeeCycles(account, { transfers = [], count = 3, today = startOfToday() } = {}) {
  const status = getMonthlyFeeStatus(account, { transfers, today })
  if (!status || !status.hasWaiver) return []
  // A balance that already waives the fee on its own needs no future nags.
  const balanceCovers = status.balanceOk === true && (status.mode === 'any' || (status.ddRequired === 0 && status.debitRequired === 0))
  if (balanceCovers) return []
  const rows = []
  let day = today
  for (let i = 0; i < count; i++) {
    const cycle = getFeeCycle(account, day)
    const current = i === 0
    const marks = []
    if (status.ddRequired > 0) marks.push((account.feeWaiverDDLog ?? []).includes(cycle.key))
    if (status.debitRequired > 0) marks.push((account.feeWaiverDebitLog ?? []).includes(cycle.key))
    const logged = marks.length > 0 && (status.mode === 'all' ? marks.every(Boolean) : marks.some(Boolean))
    if (!(current ? status.waived : logged)) {
      const sendBy = new Date(cycle.end)
      sendBy.setDate(sendBy.getDate() - FEE_SEND_LEAD_DAYS)
      rows.push({ cycleKey: cycle.key, cycleEnd: iso(cycle.end), sendBy: iso(sendBy < today ? today : sendBy), current })
    }
    day = new Date(cycle.end)
    day.setDate(day.getDate() + 1)
  }
  return rows
}
