import { statusLabel } from '../../utils/statusMeta'

// Status hues are decorative (distinct per status), so they use fixed palette
// hues with a light/dark text split rather than the semantic tokens.
const COLOR_MAP = {
  // Credit cards
  'Applied': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'Active Churn': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Bonus Met': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'Keep Alive': 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
  'Retention Call Due': 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  'Downgrade/Close Due': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  'Downgraded': 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  'Closed': 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  // Bank accounts
  'Opened': 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  'DD Linked': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'Bonus Pending': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'Bonus Received': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'Cooling Period': 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  'Safe to Close': 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
  // Applications
  'planned': 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30',
  'applied': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  'pending': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  'approved': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  'denied': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

export default function StatusBadge({ status }) {
  const cls = COLOR_MAP[status] ?? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {statusLabel(status)}
    </span>
  )
}
