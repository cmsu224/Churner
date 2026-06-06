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
]

// Keep removed statuses in the label map so existing saved data still displays correctly
const LABELS = { 'Retention Call Due': 'Annual Fee Decision' }
for (const s of [...CARD_STATUSES, ...ACCOUNT_STATUSES]) LABELS[s.value] = s.label

export function statusLabel(value) {
  return LABELS[value] ?? value ?? 'Unknown'
}

export function isRetired(card) {
  return card?.status === 'Closed' || card?.status === 'Downgraded'
}
