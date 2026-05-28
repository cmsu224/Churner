export function getClawbackStatus(account) {
  if (!account?.openedDate) return { safe: false, daysRemaining: null, message: 'No open date set' }
  const opened = new Date(account.openedDate)
  const safeDate = new Date(opened)
  safeDate.setDate(safeDate.getDate() + 181)
  const today = new Date()
  const daysRemaining = Math.ceil((safeDate - today) / 86400000)
  const safe = today >= safeDate
  const message = safe
    ? 'Safe to close — clawback window passed'
    : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until safe to close`
  return { safe, daysRemaining: safe ? 0 : daysRemaining, safeDate: safeDate.toISOString(), message }
}
