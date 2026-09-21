export const fmt$ = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)

// Whole dollars — for compact card surfaces where cents are just noise
export const fmt$0 = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount ?? 0)

export const fmtPts = (n) =>
  new Intl.NumberFormat('en-US').format(Math.round(n ?? 0))

// ── Calendar-day parsing ───────────────────────────────────────────────────
// Stored dates are calendar days ('YYYY-MM-DD'). `new Date('2026-07-15')`
// parses as UTC midnight, which renders (and subtracts) as the day before in
// every negative-offset timezone — a day of error on countdowns that can run
// for years. Parse to LOCAL midnight so day math and formatting agree.
//
// A full ISO timestamp ('2026-07-15T05:00:00.000Z') is NOT read off its text:
// the engines build those from local midnights, so the local getters give the
// day that was meant. Reading the 'YYYY-MM-DD' prefix instead would land on the
// wrong day everywhere east of UTC.
export const parseDay = (value) => {
  if (!value) return null
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const date = new Date(year, month - 1, day)
    // A day the calendar doesn't have is not a day. '2026-13-45' and
    // '2026-02-30' otherwise roll over into a real-looking date nobody typed,
    // which is worse than reporting no date at all.
    const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    return real ? date : null
  }
  const d = new Date(value)
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export const startOfToday = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

// Whole days between two local midnights (Math.round absorbs DST's ±1 hour).
export const daysBetweenDays = (from, to) => Math.round((to - from) / 86400000)

// Shift a local-midnight Date by N days. Never mutates its argument — callers
// pass dates they still need (an open date, a cycle start).
export const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Today as a storable 'YYYY-MM-DD' calendar day, in the user's own timezone.
// `new Date().toISOString().slice(0, 10)` would stamp tomorrow's date for
// anyone west of UTC after their evening — a day of drift on every countdown
// anchored to a one-tap action.
export const todayISODate = () => toISODate(new Date())

// A Date's calendar day as 'YYYY-MM-DD', read with the LOCAL getters for the
// same reason todayISODate doesn't go through toISOString().
export const toISODate = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Shift a stored calendar day by N days and return it as 'YYYY-MM-DD'.
// Goes through parseDay deliberately: `new Date('2026-08-21')` is UTC midnight,
// so reading it back with the local getters lands on the 20th anywhere west of
// UTC — one day early on every reminder anchored to a transfer.
export const addDaysISO = (value, days) =>
  toISODate(addDays(parseDay(value) ?? startOfToday(), days))

export const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parseDay(iso))
}

// Month + day only — for tight card rows where the year is obvious from context
export const fmtDateCompact = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseDay(iso))
}

// Month, day and a two-digit year — for the tracker tables, whose columns span
// several years at once. The year can't be dropped there (a card opened in
// 2023 and a reapply date in 2026 both read as "Feb 2"), but it has to stay
// narrow enough for a dozen date columns to fit.
export const fmtDateTracker = (iso) => {
  if (!iso) return '—'
  const d = parseDay(iso)
  const md = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  return `${md} ’${String(d.getFullYear()).slice(-2)}`
}

export const fmtDateShort = (iso) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(parseDay(iso))
}

// Whole days from today to a stored day — 0 means today, negative is overdue.
// Counted between calendar days, not clock instants: "3 days left" has to mean
// the same thing at 9am and at 11pm, and a deadline stored as a calendar day
// has no time of day to be precise about.
export const daysUntil = (iso) => {
  const day = parseDay(iso)
  return day ? daysBetweenDays(startOfToday(), day) : null
}

export const daysAgo = (iso) => {
  const day = parseDay(iso)
  return day ? daysBetweenDays(day, startOfToday()) : null
}
