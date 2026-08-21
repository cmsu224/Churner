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

// Month, day and a two-digit year — for the tracker tables, whose columns span
// several years at once. The year can't be dropped there (a card opened in
// 2023 and a reapply date in 2026 both read as "Feb 2"), but it has to stay
// narrow enough for a dozen date columns to fit.
export const fmtDateTracker = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const md = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  return `${md} ’${String(d.getFullYear()).slice(-2)}`
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

// ── Calendar-day parsing ───────────────────────────────────────────────────
// Stored dates are calendar days ('YYYY-MM-DD'). `new Date('2026-07-15')`
// parses as UTC midnight, which renders (and subtracts) as the day before in
// every negative-offset timezone — a day of error on countdowns that can run
// for years. Parse to LOCAL midnight so day math and formatting agree.
export const parseDay = (value) => {
  if (!value) return null
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(value)
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export const startOfToday = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

// Shift a stored calendar day by N days and return it as 'YYYY-MM-DD'.
// Goes through parseDay deliberately: `new Date('2026-08-21')` is UTC midnight,
// so reading it back with the local getters lands on the 20th anywhere west of
// UTC — one day early on every reminder anchored to a transfer.
export const addDaysISO = (value, days) => {
  const d = parseDay(value) ?? startOfToday()
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Whole days between two local midnights (Math.round absorbs DST's ±1 hour).
export const daysBetweenDays = (from, to) => Math.round((to - from) / 86400000)
