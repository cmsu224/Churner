import { getSpendDeadlineInfo } from './lifecycle'

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
  const today = new Date()
  const open = new Date(card.openDate)
  const daysElapsed = Math.max(1, Math.floor((today - open) / 86400000))

  let perDay
  let paceSource = 'average'
  const log = (card.spendLog ?? []).filter(e => e.date && (Number(e.amount) || 0) !== 0)
  if (log.length > 0) {
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - PACE_WINDOW_DAYS)
    const recent = log
      .filter(e => new Date(e.date) >= windowStart)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    perDay = Math.max(0, recent) / Math.min(PACE_WINDOW_DAYS, daysElapsed)
    paceSource = 'log'
  } else {
    perDay = spent / daysElapsed
  }

  const stalled = perDay < 1 // less than $1/day of pace — no meaningful projection
  let projectedDate = null
  if (!stalled && remaining > 0) {
    const d = new Date(today)
    d.setDate(d.getDate() + Math.ceil(remaining / perDay))
    projectedDate = d.toISOString()
  }

  const deadline = new Date(info.deadline)
  // Past the deadline there's no meaningful weekly target — clamping daysLeft to
  // 1 would report an absurd figure (remaining × 7). The overdue case is owned
  // by the critical "spend deadline missed" action item; callers show a plain
  // "past deadline" note instead of a $/week number.
  const overdue = info.daysLeft <= 0
  const onTrack = remaining === 0 || (!overdue && !stalled && projectedDate && new Date(projectedDate) <= deadline)
  const neededPerWeek = overdue ? null : remaining / (info.daysLeft / 7)

  return {
    remaining,
    daysLeft: info.daysLeft,
    deadline: info.deadline,
    perDay,
    perWeek: perDay * 7,
    paceSource,
    stalled,
    overdue,
    projectedDate,
    onTrack,
    neededPerWeek,
  }
}
