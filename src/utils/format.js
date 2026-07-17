export const fmt$ = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)

export const fmtPts = (n) =>
  new Intl.NumberFormat('en-US').format(Math.round(n ?? 0))

export const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

export const fmtDateShort = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(iso))
}

export const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

export const daysAgo = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date() - new Date(iso)) / 86400000)
}
