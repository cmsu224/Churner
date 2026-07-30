export const fmt$ = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)

// Whole dollars — for compact card surfaces where cents are just noise
export const fmt$0 = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount ?? 0)

export const fmtPts = (n) =>
  new Intl.NumberFormat('en-US').format(Math.round(n ?? 0))

export const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

// Month + day only — for tight card rows where the year is obvious from context
export const fmtDateCompact = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

export const fmtDateShort = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(iso))
}

// Today as a storable 'YYYY-MM-DD' calendar day, in the user's own timezone.
// `new Date().toISOString().slice(0, 10)` would stamp tomorrow's date for
// anyone west of UTC after their evening — a day of drift on every countdown
// anchored to a one-tap action.
export const todayISODate = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}

export const daysAgo = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date() - new Date(iso)) / 86400000)
}
