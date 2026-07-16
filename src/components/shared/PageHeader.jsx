// Standard page title row: h1 on the left, actions on the right.
export default function PageHeader({ title, actions, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-4 ${className}`}>
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
