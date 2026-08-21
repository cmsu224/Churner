import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// `sheet` docks the dialog to the bottom of the screen on phones (thumb reach,
// and it doesn't fight the on-screen keyboard) while staying a normal centered
// dialog from sm up. Everything else — focus trap, Esc, focus restore — is the
// same either way.
export default function Modal({ title, onClose, children, wide = false, sheet = false }) {
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

  // Rendered into <body>, not in place. The page-transition wrapper in AppShell
  // animates with fill-mode `both`, which leaves a stacking context behind for
  // good — inside it, this z-50 overlay loses to the z-40 mobile bottom nav and
  // the nav paints over the dialog. A portal puts the overlay back in the root
  // stacking context where its z-index means what it says.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/70 animate-fade-in ${
        sheet ? 'items-end sm:items-center p-0 sm:p-4' : 'items-center p-4'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`bg-surface border border-edge-strong shadow-pop w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} flex flex-col focus:outline-none ${
          sheet
            ? 'rounded-t-2xl sm:rounded-xl max-h-[88vh] pb-[env(safe-area-inset-bottom)] animate-slide-up sm:animate-scale-in'
            : 'rounded-xl max-h-[90vh] animate-scale-in'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge flex-shrink-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-ink-muted hover:text-ink transition-colors rounded p-0.5">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain flex-1 px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
