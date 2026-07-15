// Shared form-field primitives. `inp` / `inpRequired` are the canonical input
// class strings (imported by the legacy inline forms too), and <Field> wraps a
// label + control so spacing and label styling stay uniform.

export const inp =
  'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

export const inpRequired =
  'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

export default function Field({ label, required = false, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className={`text-xs block mb-1 ${required ? 'text-accent-ink font-medium' : 'text-ink-tertiary'}`}>
        {label}
        {required && <span className="ml-1">*required</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-ink-faint mt-1">{hint}</p>}
    </div>
  )
}
