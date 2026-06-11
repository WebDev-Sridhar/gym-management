import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Lightweight analytics shim. Forwards to gtag + PostHog if they're loaded.
// No-op gracefully when those globals are unavailable (e.g. dev with no
// analytics script). Previously logged pageview/event payloads to the dev
// console — removed 2026-06-12 to keep the console clean. Use the GA /
// PostHog dashboards for verification instead.
export function usePageTracking(pageName) {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.gtag?.('event', 'page_view', {
      page_title: pageName,
      page_path: location.pathname,
    })
    window.posthog?.capture?.('$pageview', { page: pageName, path: location.pathname })
  }, [pageName, location.pathname, location.search])
}

export function trackEvent(name, props = {}) {
  if (typeof window === 'undefined') return
  window.gtag?.('event', name, props)
  window.posthog?.capture?.(name, props)
}
