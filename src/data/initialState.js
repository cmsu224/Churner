export const DEFAULT_MEMBERS = [
  { id: 'p1', name: 'Me', role: 'churner', hex: '#3b82f6' },
  { id: 'p2', name: 'Wife', role: 'churner', hex: '#8b5cf6' },
  { id: 'p3', name: 'Mom', role: 'senior', hex: '#f59e0b' },
  { id: 'p4', name: 'Dad', role: 'senior', hex: '#10b981' },
]

export const INITIAL_STATE = {
  version: 3,
  members: DEFAULT_MEMBERS,
  creditCards: [],
  bankAccounts: [],
  // Application funnel: planned → applied → pending → approved / denied
  applications: [],
  seniorIncome: {},
  externalPayments: [],
  taxYear: new Date().getFullYear(),
  settings: {
    taxBracket: 22,
    // Cents-per-point valuation used by the Earnings view for points/miles
    // bonuses without an explicit cash value on the card.
    pointValueCents: 1,
    // Browser-notification opt-in (permission itself is per device/browser).
    notifyEnabled: false,
  },
  // Synced action-item state so a dismissal/snooze on one device holds on all.
  // dismissed: { [itemId]: dismissedAtISO }, snoozed: { [itemId]: wakeAtISO },
  // seen: array of item ids already viewed in the notification center.
  notifications: { seen: [], dismissed: {}, snoozed: {} },
}
