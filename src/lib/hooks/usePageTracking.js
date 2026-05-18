import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Lightweight analytics shim. Logs to console today; ready to forward to
// GA/PostHog/Mixpanel when those SDKs are wired up.
export function usePageTracking(pageName) {
  const location = useLocation()

  useEffect(() => {
    const payload = {
      page: pageName,
      path: location.pathname,
      search: location.search,
      ts: Date.now(),
    }

    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.info('[analytics] pageview', payload)

      window.gtag?.('event', 'page_view', {
        page_title: pageName,
        page_path: location.pathname,
      })

      window.posthog?.capture?.('$pageview', { page: pageName, path: location.pathname })
    }
  }, [pageName, location.pathname, location.search])
}

export function trackEvent(name, props = {}) {
  if (typeof window === 'undefined') return
  // eslint-disable-next-line no-console
  console.info('[analytics] event', name, props)
  window.gtag?.('event', name, props)
  window.posthog?.capture?.(name, props)
}
