import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, wide = false }) {
  const panelRef = useRef(null)
  const prevFocusRef = useRef(null)

  useEffect(() => {
    prevFocusRef.current = document.activeElement
    panelRef.current?.focus()
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        // Keep keyboard focus inside the dialog
        const focusables = panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables?.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      prevFocusRef.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`bg-surface border border-edge-strong rounded-xl shadow-pop w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col animate-scale-in focus:outline-none`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge flex-shrink-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-ink-muted hover:text-ink transition-colors rounded p-0.5">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
