import { useState } from 'react'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'

export function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
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
          ? 'bg-blue-900/40 border-blue-700/50 text-blue-300'
          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {active && <span className="text-blue-400 text-[10px] leading-none">✓</span>}
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
        active ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
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
        <SlidersHorizontal size={13} className="text-zinc-500 flex-shrink-0" />
        <span className="text-xs text-zinc-500 font-medium">Sort</span>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 cursor-pointer"
        >
          {sortOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
            open || activeCount > 0
              ? 'bg-zinc-700 border-zinc-600 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Filters
          {activeCount > 0 && (
            <span className="bg-amber-500 text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {activeCount}
            </span>
          )}
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {activeCount > 0 && (
          <button
            onClick={() => { onClear(); setOpen(false) }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>

      {/* Filter rows — shown only when expanded */}
      {open && (
        <div className="space-y-2 bg-zinc-900/60 rounded-lg border border-zinc-800 p-3">
          {children}
        </div>
      )}
    </div>
  )
}

export function FilterRow({ label, children }) {
  return (
    <div className="flex items-start gap-2 flex-wrap">
      <span className="text-[11px] text-zinc-600 font-medium w-14 flex-shrink-0 pt-1">{label}</span>
      <div className="flex gap-1.5 flex-wrap">{children}</div>
    </div>
  )
}
