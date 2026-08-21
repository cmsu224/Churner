// Reminder engine — the "check back on this" half of the Money Map.
//
// Two kinds of reminder land in one list:
//
//   1. STORED reminders you set yourself. Pushing $5,000 into a new account
//      and tapping "remind me in 3 weeks" writes one of these; it lives in
//      state.reminders and syncs like everything else.
//   2. DERIVED reminders the app works out on its own and never stores: a
//      transfer that hasn't landed when it should have, and cash left sitting
//      in an account that no longer needs it. These resolve themselves the
//      moment the underlying fact changes (mark the transfer landed, sweep the
//      money home) rather than needing to be ticked off.
//
// Both shapes carry the same fields so the Money Map, the action engine and
// the timeline can treat them identically. Derived rows are marked
// `derived: true` and have no `done` state — dismissing one is the notification
// centre's job, not this engine's.

import { getStrandedCash, getTransferStatus, EXPECTED_LANDING_DAYS, isLanded, splitNodeKey, buildNodes, nodeLabel } from './moneyFlow'
import { fmt$, parseDay, startOfToday, daysBetweenDays } from '../utils/format'

// Cash sitting idle for this long with no reason to stay earns a sweep-back
// reminder. Short enough to catch it, long enough not to nag the day a bonus
// posts while you're still deciding what to do.
export const STRANDED_CASH_DAYS = 14

export const REMINDER_KINDS = [
  { value: 'check_bonus',    label: 'Check if the bonus posted' },
  { value: 'check_transfer', label: 'Confirm the transfer landed' },
  { value: 'sweep_back',     label: 'Move the money back home' },
  { value: 'check_dd',       label: 'Check the direct deposit coded' },
  { value: 'custom',         label: 'Reminder' },
]

export function kindLabel(kind) {
  return REMINDER_KINDS.find(k => k.value === kind)?.label ?? 'Reminder'
}

export function isDone(reminder) {
  return !!reminder?.doneDate
}

// Overdue → due today → upcoming, with the day count the UI renders.
export function reminderTiming(dueDate) {
  const due = parseDay(dueDate)
  if (!due) return { state: 'undated', days: null }
  const days = daysBetweenDays(startOfToday(), due)
  if (days < 0) return { state: 'overdue', days }
  if (days === 0) return { state: 'today', days: 0 }
  return { state: 'upcoming', days }
}

function nodeName(nodes, key) {
  const parsed = splitNodeKey(key)
  if (!parsed) return 'somewhere'
  const node = nodes.find(n => n.kind === parsed.kind && n.id === parsed.id)
  return node ? nodeLabel(node) : 'a closed account'
}

// Every reminder that still wants attention, soonest first. `horizonDays`
// trims the far future off the Money Map's board without hiding anything from
// the timeline, which passes a wide window.
export function collectReminders(state, { horizonDays = null, includeDone = false } = {}) {
  const rows = []
  const { all: nodes } = buildNodes(state)
  const transfers = state.transfers ?? []

  // ── 1. Stored reminders ──────────────────────────────────────────────────
  for (const r of (state.reminders ?? [])) {
    if (isDone(r) && !includeDone) continue
    rows.push({
      id: r.id,
      reminderId: r.id,
      derived: false,
      kind: r.kind ?? 'custom',
      title: r.title || kindLabel(r.kind),
      detail: r.notes ?? '',
      dueDate: r.dueDate ?? null,
      accountId: r.accountId ?? null,
      transferId: r.transferId ?? null,
      amount: r.amount ?? null,
      done: isDone(r),
      doneDate: r.doneDate ?? null,
      ...reminderTiming(r.dueDate),
    })
  }

  // ── 2. Transfers that should have landed by now ──────────────────────────
  for (const t of transfers) {
    if (isLanded(t)) continue
    const status = getTransferStatus(t)
    if (!status.late) continue
    const from = nodeName(nodes, t.fromKey)
    const to = nodeName(nodes, t.toKey)
    rows.push({
      id: `xfer-late-${t.id}`,
      derived: true,
      kind: 'check_transfer',
      title: `${fmt$(t.amount)} still in flight: ${from} → ${to}`,
      detail: `Sent ${status.daysInFlight} days ago and still not marked as landed — an ACH push normally clears in ${t.expectedDays ?? EXPECTED_LANDING_DAYS} days. Check both ends: if it arrived, mark it landed; if it didn't, call before the trail goes cold.`,
      dueDate: status.expectedDate,
      transferId: t.id,
      accountId: splitNodeKey(t.toKey)?.kind === 'account' ? splitNodeKey(t.toKey).id : null,
      amount: t.amount ?? null,
      done: false,
      ...reminderTiming(status.expectedDate),
    })
  }

  // ── 3. Cash with no reason to stay where it is ───────────────────────────
  for (const row of getStrandedCash(state)) {
    if (row.daysIdle != null && row.daysIdle < STRANDED_CASH_DAYS) continue
    // A stored sweep-back reminder for the same account already covers it.
    const covered = (state.reminders ?? []).some(r => !isDone(r) && r.kind === 'sweep_back' && r.accountId === row.accountId)
    if (covered) continue
    const label = row.account.bankName + (row.account.last4 ? ` ···${row.account.last4}` : '')
    rows.push({
      id: `sweep-${row.accountId}`,
      derived: true,
      kind: 'sweep_back',
      title: `Bring ${fmt$(row.amount)} home from ${label}`,
      detail: `${row.reason}. ${row.daysIdle != null ? `It has been sitting there ${row.daysIdle} days. ` : ''}Push it back to your main account so it isn't forgotten in an account you'll close later.`,
      dueDate: null,
      accountId: row.accountId,
      amount: row.amount,
      done: false,
      state: 'idle',
      days: row.daysIdle,
    })
  }

  const withinHorizon = (r) => {
    if (horizonDays == null) return true
    if (r.days == null) return true
    return r.days <= horizonDays
  }

  // Overdue first, then today, then soonest upcoming, then undated/idle rows
  // (biggest idle balance first — the money most worth chasing).
  const rank = { overdue: 0, today: 1, upcoming: 2, idle: 3, undated: 4 }
  return rows.filter(withinHorizon).sort((a, b) => {
    const d = (rank[a.state] ?? 5) - (rank[b.state] ?? 5)
    if (d !== 0) return d
    if (a.state === 'idle' && b.state === 'idle') return (b.amount ?? 0) - (a.amount ?? 0)
    return (a.days ?? 0) - (b.days ?? 0)
  })
}

// Convenience for the header stats and the dashboard tile.
export function reminderCounts(reminders) {
  return {
    total: reminders.length,
    overdue: reminders.filter(r => r.state === 'overdue').length,
    today: reminders.filter(r => r.state === 'today').length,
  }
}
