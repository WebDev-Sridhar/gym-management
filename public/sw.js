/* Gymmobius — minimal service worker.
 *
 * Purpose: satisfy Chrome's PWA installability requirements (a registered SW
 * with a fetch handler is mandatory since Chrome 73). We don't cache anything
 * aggressive — the network always wins, so app updates are immediate.
 *
 * Bump SW_VERSION to force all clients to fetch the new SW on next visit.
 *
 * Multi-tenant isolation note
 * ───────────────────────────
 * Each subdomain (owngainz.gymmobius.com, fitzone.gymmobius.com, etc.) is a
 * distinct browser origin. The browser automatically isolates between origins:
 *   • separate service worker registration & scope
 *   • separate Cache Storage (no cross-tenant cache collisions possible)
 *   • separate localStorage / sessionStorage / IndexedDB
 *   • separate auth cookies
 *
 * No explicit tenant-keying is needed in this SW for isolation. If caching is
 * added in the future, prefix any cache name with SW_VERSION (already unique
 * per deploy) to avoid stale-asset issues across versions.
 */
const SW_VERSION = 'v2-2026-05-27'

self.addEventListener('install', () => {
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
