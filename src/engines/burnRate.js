import { getSpendDeadlineInfo } from './lifecycle'
import { addDays, daysBetweenDays, parseDay, startOfToday } from '../utils/format'

// Burn-rate projection for cards with an open minimum-spend requirement.
//
// Pace source: when the card has spend-log entries, pace = logged spend over
// the last 30 days (recent behavior beats lifetime average). Otherwise it
// falls back to the flat average currentSpend / days-since-open.
// A pace under ~$1/day counts as "stalled" — no projection date is possible.

const PACE_WINDOW_DAYS = 30

export function getBurnRate(card) {
  const info = getSpendDeadlineInfo(card)
  if (!info || info.met) return null

  const req = Number(card.spendRequirement) || 0
  const spent = Number(card.currentSpend) || 0
  const remaining = Math.max(0, req - spent)
  const today = startOfToday()
  // A stored date the app can't read leaves every figure below NaN. Treating
  // it as "no usable pace" keeps the card out of the pace warning instead of
  // throwing on `new Date(NaN).toISOString()` and taking the whole action
  // queue down with it.
  const open = parseDay(card.openDate)
  const daysElapsed = open ? Math.max(1, daysBetweenDays(open, today)) : null

  let perDay = null
  let paceSource = 'average'
  const log = (card.spendLog ?? []).filter(e => e.date && (Number(e.amount) || 0) !== 0)
  if (daysElapsed !== null && log.length > 0) {
    const windowStart = addDays(today, -PACE_WINDOW_DAYS)
    const recent = log
      .filter(e => {
        const day = parseDay(e.date)
        return !!day && day >= windowStart
      })
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    perDay = Math.max(0, recent) / Math.min(PACE_WINDOW_DAYS, daysElapsed)
    paceSource = 'log'
  } else if (daysElapsed !== null) {
    perDay = spent / daysElapsed
  }

  // Less than $1/day of pace — or no readable pace at all — means no
  // meaningful projection.
  const stalled = !Number.isFinite(perDay) || perDay < 1
  let projectedDate = null
  if (!stalled && remaining > 0) {
    projectedDate = addDays(today, Math.ceil(remaining / perDay)).toISOString()
  }

  const deadline = parseDay(info.deadline)
  // Past the deadline there's no meaningful weekly target — clamping daysLeft to
  // 1 would report an absurd figure (remaining × 7). The overdue case is owned
  // by the critical "spend deadline missed" action item; callers show a plain
  // "past deadline" note instead of a $/week number.
  const overdue = info.daysLeft <= 0
  const onTrack = remaining === 0
    || (!overdue && !stalled && !!projectedDate && !!deadline && parseDay(projectedDate) <= deadline)
  const neededPerWeek = overdue ? null : remaining / (info.daysLeft / 7)

  return {
    remaining,
    daysLeft: info.daysLeft,
    deadline: info.deadline,
    perDay: perDay ?? 0,
    perWeek: (perDay ?? 0) * 7,
    paceSource,
    stalled,
    overdue,
    projectedDate,
    onTrack,
    neededPerWeek,
  }
}
