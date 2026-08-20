import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scroll to an item row and flash it. Views render the target element with
// id={`item-${entityId}`}. `delay` gives a view that's mid-swap (the tracker
// table flipping back to the card list) a beat to mount the target first.
export function flashItem(id, delay = 0) {
  const run = () => {
    const el = document.getElementById(`item-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-flash')
    setTimeout(() => el.classList.remove('highlight-flash'), 3200)
  }
  if (delay <= 0) { run(); return }
  setTimeout(run, delay)
}

// Scrolls to and flashes the element for ?highlight=<id> after navigation.
// Views opt in by calling useHighlight() and rendering the target element
// with id={`item-${entityId}`}. Used by the command palette and the
// notification center to jump straight to a card/account/application.
export function useHighlight() {
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('highlight')
    if (!id) return
    // Give the view a beat to render before scrolling
    const t = setTimeout(() => flashItem(id), 120)
    return () => clearTimeout(t)
  }, [location.search])
}
