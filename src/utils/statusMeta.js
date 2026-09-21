// Friendlier status labels. Stored values stay stable (so existing data and
// the lifecycle engine keep working); only the displayed label changes.

export const CARD_STATUSES = [
  { value: 'Applied',             label: 'Applied' },
  { value: 'Active Churn',        label: 'Earning Bonus' },
  { value: 'Bonus Met',           label: 'Bonus Earned' },
  { value: 'Keep Alive',          label: 'Keep Alive' },
  { value: 'Downgrade/Close Due', label: 'Cancel or Downgrade' },
  { value: 'Downgraded',          label: 'Downgraded' },
  { value: 'Closed',              label: 'Closed' },
]

export const ACCOUNT_STATUSES = [
  { value: 'Opened',         label: 'Opened' },
  { value: 'DD Linked',      label: 'Direct Deposit Linked' },
  { value: 'Bonus Pending',  label: 'Bonus Pending' },
  { value: 'Bonus Received', label: 'Bonus Received' },
  { value: 'Cooling Period', label: 'Holding (Clawback)' },
  { value: 'Safe to Close',  label: 'Safe to Close' },
  { value: 'Closed',         label: 'Closed' },
]

// Application funnel statuses (stored lowercase to stay distinct from the
// card status 'Applied').
export const APPLICATION_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'applied', label: 'Applied' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
]

// Keep removed statuses in the label map so existing saved data still displays correctly
const LABELS = { 'Retention Call Due': 'Annual Fee Decision' }
for (const s of [...CARD_STATUSES, ...ACCOUNT_STATUSES, ...APPLICATION_STATUSES]) LABELS[s.value] = s.label

export function statusLabel(value) {
  return LABELS[value] ?? value ?? 'Unknown'
}

export function isRetired(card) {
  return card?.status === 'Closed' || card?.status === 'Downgraded'
}

// Account statuses that are already past the bonus stage.
export const ACCOUNT_BONUS_DONE_STATUSES = ['Bonus Received', 'Cooling Period', 'Safe to Close', 'Closed']

// THE definition of "the bank bonus is in hand", used by every page and every
// reminder. It has to be one predicate: an account whose status says the bonus
// landed but which carries no received date was still chasing the bonus as far
// as the action queue and the timeline were concerned, so the app kept shouting
// "DD deadline passed — call the bank now" about money already collected, and
// Earnings booked $0 for it while the tax figure counted it in full.
//
// Three ways to say it, because three parts of the app write it: the received
// DATE (the account editor and the "✓ Bonus Received" button), the received
// FLAG (older records and imports), and the STATUS (quick status changes, and
// backups written by other tools).
//
// It lives here, with no imports of its own, so every engine can reach it
// without an import cycle.
export function isAccountBonusReceived(account) {
  return !!account?.bonusReceivedDate
    || !!account?.bonusReceived
    || ACCOUNT_BONUS_DONE_STATUSES.includes(account?.status ?? '')
}
