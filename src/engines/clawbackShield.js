import { addDays, daysBetweenDays, parseDay, startOfToday } from '../utils/format'

// 181-day bank clawback window. Calendar-day math throughout: the open date is
// a stored 'YYYY-MM-DD', so parsing it as UTC midnight (what `new Date(str)`
// does) would report one day fewer remaining for every user west of UTC.
export function getClawbackStatus(account) {
  const opened = parseDay(account?.openedDate)
  if (!opened) return { safe: false, daysRemaining: null, safeDate: null, message: 'No open date set' }
  const safeDate = addDays(opened, 181)
  const daysRemaining = daysBetweenDays(startOfToday(), safeDate)
  const safe = daysRemaining <= 0
  const message = safe
    ? 'Safe to close — clawback window passed'
    : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until safe to close`
  return { safe, daysRemaining: safe ? 0 : daysRemaining, safeDate: safeDate.toISOString(), message }
}
