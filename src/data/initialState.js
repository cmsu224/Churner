// Default identity colors are a CVD-validated categorical set (checked with
// the dataviz palette validator on both light and dark surfaces) since they
// drive the badges AND the earnings charts. Users can still pick any color.
export const DEFAULT_MEMBERS = [
  { id: 'p1', name: 'Me', role: 'churner', hex: '#2563eb' },
  { id: 'p2', name: 'Wife', role: 'churner', hex: '#e11d48' },
  { id: 'p3', name: 'Mom', role: 'senior', hex: '#d97706' },
  { id: 'p4', name: 'Dad', role: 'senior', hex: '#059669' },
]

export const INITIAL_STATE = {
  version: 3,
  members: DEFAULT_MEMBERS,
  creditCards: [],
  bankAccounts: [],
  // Application funnel: planned → applied → pending → approved / denied
  applications: [],
  // Loyalty balances: one entry per member per program (Chase UR, MR, airline
  // miles, hotel points…). balance is points; est. value comes from the global
  // per-program rates (settings.programValueCents / built-in defaults).
  pointsBalances: [],
  seniorIncome: {},
  externalPayments: [],
  taxYear: new Date().getFullYear(),
  settings: {
    taxBracket: 22,
    // Fallback ¢/pt for points in programs without a per-program valuation
    // (custom/unknown programs only).
    pointValueCents: 1,
    // Global per-program ¢/pt overrides, keyed by lowercased canonical program
    // name (e.g. 'hilton honors': 0.5). Used app-wide — Points, Dashboard,
    // pipeline, Earnings. Empty = the built-in defaults in utils/programs.js.
    programValueCents: {},
    // Browser-notification opt-in (permission itself is per device/browser).
    notifyEnabled: false,
  },
  // Synced action-item state so a dismissal/snooze on one device holds on all.
  // dismissed: { [itemId]: dismissedAtISO }, snoozed: { [itemId]: wakeAtISO },
  // seen: array of item ids already viewed in the notification center.
  notifications: { seen: [], dismissed: {}, snoozed: {} },
}
