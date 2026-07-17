import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { POINT_PROGRAMS } from '../../utils/programs'

// Custom typeahead for the Program field. Replaces the native <datalist>,
// whose picker is unreliable across browsers (inconsistent filtering, a
// dropdown arrow that sometimes does nothing, and crash-prone under rapid
// clicks in some Chromium builds). This is a plain controlled input + a
// React-rendered suggestion list: filters as you type, full keyboard nav,
// and free text is always allowed.
export default function ProgramCombobox({ value, onChange, className, placeholder, autoFocus }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const wrapRef = useRef(null)
  const listRef = useRef(null)

  const q = (value ?? '').toLowerCase().trim()
  const matches = useMemo(() => {
    if (!q) return POINT_PROGRAMS
    return POINT_PROGRAMS.filter(p =>
      p.name.toLowerCase().includes(q)
      || p.type.toLowerCase().startsWith(q)
      || p.match.some(m => m.includes(q) || q.includes(m))
    )
  }, [q])
  const hiClamped = Math.min(hi, Math.max(0, matches.length - 1))

  useEffect(() => {
    // Keep the highlighted row visible while arrowing
    listRef.current?.querySelector(`[data-idx="${hiClamped}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hiClamped, open])

  function choose(name) {
    onChange(name)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHi(h => e.key === 'ArrowDown'
        ? Math.min(h + 1, matches.length - 1)
        : Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && matches[hiClamped]) {
        e.preventDefault()
        choose(matches[hiClamped].name)
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      className="relative"
      ref={wrapRef}
      onBlur={e => { if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false) }}
    >
      <input
        className={`${className} pr-8`}
        value={value ?? ''}
        onChange={e => { onChange(e.target.value); setOpen(true); setHi(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label="Program"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Close program suggestions' : 'Show program suggestions'}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(o => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink transition-colors"
      >
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && matches.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Program suggestions"
          className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-surface border border-edge-strong rounded-lg shadow-pop py-1"
        >
          {matches.map((p, i) => (
            <li key={p.name}>
              <button
                type="button"
                data-idx={i}
                role="option"
                aria-selected={i === hiClamped}
                onMouseEnter={() => setHi(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(p.name)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                  i === hiClamped ? 'bg-accent/15 text-ink' : 'text-ink-secondary'
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-[11px] text-ink-tertiary flex-shrink-0">{p.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
