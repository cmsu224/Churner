import { X } from 'lucide-react'

// A date input that's easy to clear on desktop: press Backspace/Delete while
// focused, or click the × button. Native <input type="date"> alone can't be
// cleared by keyboard in most browsers — this wraps it to fix that.
export default function DateField({ value, onChange, className }) {
  const v = value ? String(value).slice(0, 10) : ''
  const base = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'
  return (
    <div className="relative">
      <input
        type="date"
        value={v}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault()
            onChange('')
          }
        }}
        className={`${className ?? base} ${v ? 'pr-8' : ''}`}
      />
      {v && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Clear date"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
