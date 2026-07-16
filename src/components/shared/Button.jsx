// Shared button atom — one place for button styling so views stop improvising.
// variant: primary (accent CTA) | subtle (raised neutral) | outline | ghost | danger
// size: xs | sm | md

const VARIANTS = {
  primary: 'bg-accent hover:bg-accent-hover text-white font-semibold',
  subtle: 'bg-raised hover:bg-overlay text-ink-secondary hover:text-ink',
  outline: 'bg-transparent border border-edge-strong text-ink-muted hover:text-ink hover:border-ink-faint',
  ghost: 'text-ink-muted hover:text-ink hover:bg-raised',
  danger: 'bg-danger/15 hover:bg-danger/25 text-danger-ink border border-danger/30',
}

const SIZES = {
  xs: 'text-xs px-2.5 py-1.5',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export default function Button({ variant = 'subtle', size = 'sm', className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant] ?? VARIANTS.subtle} ${SIZES[size] ?? SIZES.sm} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
