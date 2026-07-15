export default function ProgressBar({ value, max, colorClass = 'bg-info', label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const barColor = pct >= 100
    ? 'bg-success'
    : pct < 50 && label?.includes('days') && parseInt(label) < 14
    ? 'bg-danger'
    : colorClass
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        {label && <span>{label}</span>}
        <span className="ml-auto">{pct}%</span>
      </div>
      <div className="h-1.5 bg-overlay rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
