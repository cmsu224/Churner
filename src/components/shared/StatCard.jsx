// Compact stat tile used on the Dashboard and Earnings views.
const TONES = {
  default: 'text-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  danger: 'text-danger-ink',
  accent: 'text-accent-ink',
}

export default function StatCard({ label, value, sub, tone = 'default', className = '' }) {
  return (
    <div className={`bg-surface border border-edge rounded-xl p-3 text-center shadow-card ${className}`}>
      <div className="text-xs text-ink-tertiary mb-1">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${TONES[tone] ?? TONES.default}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-faint mt-0.5">{sub}</div>}
    </div>
  )
}
