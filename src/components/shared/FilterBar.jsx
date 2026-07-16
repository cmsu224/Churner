import { useState } from 'react'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'

export function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
        active
          ? 'bg-accent/15 border-accent/40 text-accent-ink'
          : 'bg-raised border-edge-strong text-ink-tertiary hover:text-ink-secondary'
      }`}
    >
      {active && <span className="text-accent-ink text-[10px] leading-none">✓</span>}
      {children}
    </button>
  )
}

export function MultiPill({ value, values, onToggle, label }) {
  const active = values.includes(value)
  return (
    <button
      onClick={() => onToggle(value)}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
      }`}
    >
      {label ?? value}
    </button>
  )
}

export default function FilterBar({ activeCount, sortBy, onSortChange, sortOptions, onClear, children }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 space-y-2">
      {/* Control row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal size={13} className="text-ink-tertiary flex-shrink-0" />
        <span className="text-xs text-ink-tertiary font-medium">Sort</span>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="bg-raised border border-edge-strong text-xs text-ink-secondary rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-edge-strong cursor-pointer"
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
            open || activeCount > 0
              ? 'bg-overlay border-edge-strong text-ink'
              : 'bg-raised border-edge-strong text-ink-tertiary hover:text-ink-secondary'
          }`}
        >
          Filters
          {activeCount > 0 && (
            <span className="bg-warning text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {activeCount > 0 && (
          <button
            onClick={() => { onClear(); setOpen(false) }}
            className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink bg-raised hover:bg-overlay border border-edge-strong px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Filter rows — shown only when expanded */}
      {open && (
        <div className="space-y-2 bg-surface/60 rounded-lg border border-edge p-3">
          {children}
        </div>
      )}
    </div>
  )
}

export function FilterRow({ label, children }) {
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-[11px] text-ink-faint font-medium w-14 flex-shrink-0 pt-1">{label}</span>
      <div className="flex gap-1.5 flex-wrap">{children}</div>
    </div>
  )
}
