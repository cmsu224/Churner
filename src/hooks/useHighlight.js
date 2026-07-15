import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

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
    const t = setTimeout(() => {
      const el = document.getElementById(`item-${id}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-flash')
      setTimeout(() => el.classList.remove('highlight-flash'), 3200)
    }, 120)
    return () => clearTimeout(t)
  }, [location.search])
}
