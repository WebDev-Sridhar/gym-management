import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminRefresh } from '../components/AdminLayout'

/**
 * Fetch + optional polling for admin reads. Registers its refresh fn with the
 * layout so the topbar Refresh button drives the active page. V1 realtime
 * strategy is polling (default 60s); later phases swap to Supabase realtime.
 *
 * `fetcher` should be stable (wrap in useCallback in the page).
 */
export function usePolledData(fetcher, { intervalMs = 60000, enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const register = useAdminRefresh()
  const mounted = useRef(true)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const result = await fetcher()
      if (mounted.current) { setData(result); setError(null) }
    } catch (err) {
      if (mounted.current) setError(err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    mounted.current = true
    if (!enabled) { setLoading(false); return }
    load()
    register?.(() => load({ silent: true }))
    const id = intervalMs ? setInterval(() => load({ silent: true }), intervalMs) : null
    return () => { mounted.current = false; if (id) clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, intervalMs, enabled])

  return { data, loading, error, refresh: () => load({ silent: true }) }
}
