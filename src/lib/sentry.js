// Sentry init + thin wrappers.
//
// Reads `VITE_SENTRY_DSN` at build time. If the env var is unset (typical
// for local dev) every helper is a no-op — so the rest of the codebase
// can call `captureError(err)` unconditionally without guarding for
// "is Sentry initialized?".
//
// Bundle-size note: `@sentry/react` is ~50-70KB gzipped. Acceptable for
// the entire app's error/perf observability. We deliberately don't pull
// in `Sentry.replayIntegration()` (~30KB more) until we actually need
// session replay — easy to add later.

import * as Sentry from '@sentry/react'

const DSN     = import.meta.env.VITE_SENTRY_DSN || ''
const ENV     = import.meta.env.MODE || 'development'
const RELEASE = import.meta.env.VITE_APP_RELEASE || undefined

let initialized = false

export function initSentry() {
  if (initialized) return
  if (!DSN) {
    if (ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[sentry] VITE_SENTRY_DSN unset — error tracking disabled')
    }
    return
  }
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    // Sample 100% of errors but only 10% of transactions to stay under
    // the free-tier quota at our expected first-10-customer volume.
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    // Don't capture noisy known issues. ResizeObserver loop is benign.
    ignoreErrors: [
      'ResizeObserver loop completed',
      'ResizeObserver loop limit exceeded',
      // Razorpay Checkout closes via a postMessage; surfaces as "checkout_dismissed"
      // in our auth flow. Already handled cleanly in the catch sites — no need
      // to ping Sentry on every user-cancelled payment.
      'checkout_dismissed',
    ],
  })
  initialized = true
}

/**
 * Capture an arbitrary error. Safe to call unconditionally —
 * silent no-op if Sentry isn't initialized.
 */
export function captureError(err, context) {
  if (!initialized) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}

/**
 * Attach the logged-in user to Sentry's scope so errors are correlated.
 * Call from AuthContext after profile loads. Pass null to clear on signout.
 */
export function setSentryUser(user) {
  if (!initialized) return
  Sentry.setUser(user ?? null)
}

// Re-export Sentry.ErrorBoundary so callers don't need to import from
// @sentry/react directly. When Sentry isn't initialized the boundary
// still catches errors and renders the fallback — it just doesn't ship
// the error to Sentry.
export { ErrorBoundary as SentryErrorBoundary } from '@sentry/react'
