// Registers the service worker behind public/sw.js. Having one with a fetch
// handler is what lets Chrome offer "Install app" instead of a plain bookmark,
// and it is what makes Churner open offline.
//
// Dev is deliberately skipped so the Vite dev server is never served from cache.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => { /* offline support is optional; the app works without it */ })
  })
}
