/* Churner service worker.
 *
 * Goals, in order:
 *   1. Make the app installable (a fetch handler is required for the install prompt).
 *   2. Let it open offline — the shell and hashed build assets are cached.
 *   3. Never touch user data. Gist sync talks to api.github.com, which is
 *      cross-origin and therefore skipped entirely: nothing private is stored
 *      in the Cache API, and a stale response can never shadow a live sync.
 *
 * Bump VERSION on any change here so old caches get dropped on activate.
 */
const VERSION = 'v1'
const CACHE = `churner-${VERSION}`

// Resolved against the service worker's own URL, so this keeps working
// regardless of the base path the app is deployed under.
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individual adds so one 404 can't fail the whole install.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Allow the page to activate a waiting worker on demand.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

const scope = new URL(self.registration.scope)

// The app shell, used as the offline fallback for navigations. The app uses
// HashRouter, so every route resolves to this one document.
const shellUrl = new URL('./', self.registration.scope).href

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Anything outside our own scope (api.github.com gist sync, issuer favicons,
  // any other third party) goes straight to the network, uncached.
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return

  // Navigations: network-first so a fresh deploy is picked up immediately,
  // falling back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(shellUrl, copy))
          }
          return response
        })
        .catch(() => caches.match(shellUrl).then((cached) => cached || Response.error()))
    )
    return
  }

  // Static assets: cache-first, then refresh in the background. Vite fingerprints
  // build output, so a cached hit is always the right bytes for that filename.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') cache.put(request, response.clone())
            return response
          })
          // Offline with nothing cached: respondWith needs a Response, not undefined.
          .catch(() => cached || Response.error())
        return cached || network
      })
    )
  )
})
