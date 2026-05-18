import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'gymmobius-dismissed-banners'

function readStorage() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

/**
 * Track dismissed dashboard banners in localStorage.
 *
 * Returns:
 *   { dismissed, dismiss, restore, isDismissed }
 *
 * The list is keyed by banner.id from bannerConfig.js. Dismissals persist
 * across sessions on the same browser. (Future: sync to a `user_dismissals`
 * table for cross-device persistence.)
 */
export function useDismissedBanners() {
  const [dismissed, setDismissed] = useState(readStorage)

  // Keep multi-tab in sync — if another tab dismisses a banner, we update too.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setDismissed(readStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      writeStorage(next)
      return next
    })
  }, [])

  const restore = useCallback((id) => {
    setDismissed(prev => {
      const next = prev.filter(x => x !== id)
      writeStorage(next)
      return next
    })
  }, [])

  const isDismissed = useCallback((id) => dismissed.includes(id), [dismissed])

  return { dismissed, dismiss, restore, isDismissed }
}
