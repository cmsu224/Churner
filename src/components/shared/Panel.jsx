// Shared surface container — the standard card/panel shell.
export default function Panel({ className = '', children, ...props }) {
  return (
    <div className={`bg-surface border border-edge rounded-xl shadow-card ${className}`} {...props}>
      {children}
    </div>
  )
}
