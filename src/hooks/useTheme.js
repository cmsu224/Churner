import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('churner_theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    // Keep the installed-app chrome (title bar, status bar) matching the theme.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#09090b' : '#f4f4f5')
    try { localStorage.setItem('churner_theme', theme) } catch { /* ignore */ }
  }, [theme])

  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }
}
