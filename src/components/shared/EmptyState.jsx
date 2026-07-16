// Shared empty state — consistent look for "nothing here yet" and
// "no results match" moments across every view.
export default function EmptyState({ icon: Icon, title, hint, action, className = '' }) {
  return (
    <div className={`text-center py-12 px-4 animate-fade-in ${className}`}>
      {Icon && (
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-raised flex items-center justify-center">
          <Icon size={22} className="text-ink-tertiary" aria-hidden="true" />
        </div>
      )}
      <div className="text-base font-medium text-ink-muted mb-1">{title}</div>
      {hint && <div className="text-sm text-ink-tertiary max-w-sm mx-auto">{hint}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
