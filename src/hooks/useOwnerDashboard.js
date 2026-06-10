import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useBranch } from '../store/BranchContext'
import { fetchOwnerDashboard } from '../services/dashboardService'

/**
 * useOwnerDashboard — single-call snapshot for the redesigned owner dashboard.
 *
 * - Stale-while-revalidate: a warm (≤60s) cache for the (gymId, branchId) key
 *   paints instantly on navigation-back, then refreshes in the background.
 * - De-dupes in-flight requests across mounts.
 * - Refetches on window focus (owner switches back to the tab → fresh numbers).
 * - Exposes refresh() so an action (send reminder, verify) can re-pull after a
 *   mutation, and lastUpdated for the "Updated Nm ago" stamp.
 *
 * Per OWNER_DASHBOARD_REDESIGN.md §14, this is deliberately poll-light: no
 * realtime sockets. Window-focus + manual refresh keep it current.
 */

const TTL_MS = 60 * 1000
const cache = new Map() // key → { data, fetchedAt, inflight }

const keyFor = (gymId, branchId) => `${gymId}::${branchId || 'all'}`

export function invalidateOwnerDashboard(gymId, branchId) {
  if (gymId) cache.delete(keyFor(gymId, branchId))
  else cache.clear()
}

async function load(gymId, branchId, { force = false } = {}) {
  const key = keyFor(gymId, branchId)
  const cached = cache.get(key)
  const fresh = cached?.data && Date.now() - cached.fetchedAt < TTL_MS
  if (!force && fresh) return cached.data
  if (cached?.inflight) return cached.inflight

  const promise = fetchOwnerDashboard(gymId, branchId)
    .then((data) => { cache.set(key, { data, fetchedAt: Date.now(), inflight: null }); return data })
    .catch((err) => { cache.set(key, { ...(cached || {}), inflight: null }); throw err })

  cache.set(key, { ...(cached || {}), inflight: promise })
  return promise
}

export function useOwnerDashboard() {
  const { gymId } = useAuth()
  const { selectedBranchId } = useBranch()
  const key = gymId ? keyFor(gymId, selectedBranchId) : null

  // Initialise straight from cache so a warm key paints with zero flash — and
  // re-derive when the key changes (branch switch) without a setState-in-effect.
  const [state, setState] = useState(() => {
    const warm = key ? cache.get(key)?.data ?? null : null
    return { key, data: warm, loading: !warm, error: null }
  })
  if (state.key !== key) {
    // Render-phase reset on key change — the React-recommended alternative to
    // syncing derived state inside an effect.
    const warm = key ? cache.get(key)?.data ?? null : null
    setState({ key, data: warm, loading: !warm, error: null })
  }

  // Manual-refresh indicator — distinct from `loading` (first paint) so the
  // refresh button can spin even when cached data is already on screen.
  const [refreshing, setRefreshing] = useState(false)

  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const run = useCallback((opts) => {
    if (!gymId) { setState((s) => ({ ...s, loading: false })); return Promise.resolve(null) }
    const k = keyFor(gymId, selectedBranchId)
    return load(gymId, selectedBranchId, opts)
      .then((d) => { if (mounted.current) setState({ key: k, data: d, loading: false, error: null }) })
      .catch((err) => { if (mounted.current) setState((s) => ({ ...s, loading: false, error: err })) })
  }, [gymId, selectedBranchId])

  useEffect(() => { run() }, [run])

  useEffect(() => {
    if (!gymId) return
    const onFocus = () => run({ force: true })
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [gymId, run])

  // Manual refresh: re-fetches the snapshot (NOT a page reload) and spins the
  // button until the new data lands.
  const refresh = useCallback(() => {
    setRefreshing(true)
    return run({ force: true }).finally(() => { if (mounted.current) setRefreshing(false) })
  }, [run])

  const lastUpdated = key ? cache.get(key)?.fetchedAt ?? null : null

  return { data: state.data, loading: state.loading, error: state.error, refreshing, refresh, lastUpdated }
}
