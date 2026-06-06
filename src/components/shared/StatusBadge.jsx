import { statusLabel } from '../../utils/statusMeta'

const COLOR_MAP = {
  'Applied': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Active Churn': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Bonus Met': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Keep Alive': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'Retention Call Due': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Downgrade/Close Due': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Downgraded': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'Closed': 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30',
  'Opened': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'DD Linked': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Bonus Pending': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Bonus Received': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Cooling Period': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Safe to Close': 'bg-green-500/20 text-green-300 border-green-500/30',
}

export default function StatusBadge({ status }) {
  const cls = COLOR_MAP[status] ?? 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {statusLabel(status)}
    </span>
  )
}
