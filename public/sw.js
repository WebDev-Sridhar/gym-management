/* Gymmobius — minimal service worker.
 *
 * Purpose: satisfy Chrome's PWA installability requirements (a registered SW
 * with a fetch handler is mandatory since Chrome 73). We don't cache anything
 * aggressive — the network always wins, so app updates are immediate.
 *
 * Bump SW_VERSION to force all clients to fetch the new SW on next visit.
 */
const SW_VERSION = 'v1-2026-05-18'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Pass-through fetch handler — required for installability. We deliberately
// don't cache responses here; once we want offline support, we can bolt on
// Workbox or a small custom cache layer keyed off SW_VERSION.
self.addEventListener('fetch', () => {
  // No-op — let the browser handle the request normally.
})
