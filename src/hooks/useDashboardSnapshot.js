import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { fetchDashboardStats, fetchGymDetails } from '../services/membershipService'

/**
 * useDashboardSnapshot — lightweight gym + stats fetch with in-memory cache.
 *
 * Used by BannerSlot (and any page that wants a cheap read-only snapshot
 * for contextual UI). The cache prevents duplicate queries when the slot
 * is mounted on multiple pages in a session.
 *
 * Cache: keyed by gymId, TTL ≈ 60 seconds. Mutations elsewhere
 * (e.g. saving payment settings) can call `invalidateDashboardSnapshot()`
 * to force a refresh.
 */

const TTL_MS = 60 * 1000
const cache = new Map() // gymId → { gym, stats, fetchedAt, inflight }

export function invalidateDashboardSnapshot(gymId) {
  if (gymId) cache.delete(gymId)
  else cache.clear()
}

async function loadSnapshot(gymId) {
  const cached = cache.get(gymId)
  const fresh  = cached && (Date.now() - cached.fetchedAt) < TTL_MS

  if (fresh && cached.gym && cached.stats) {
    return { gym: cached.gym, stats: cached.stats }
  }

  // De-dupe in-flight requests
  if (cached?.inflight) return cached.inflight

  const promise = Promise.all([
    fetchGymDetails(gymId),
    fetchDashboardStats(gymId),
  ]).then(([gym, stats]) => {
    cache.set(gymId, { gym, stats, fetchedAt: Date.now(), inflight: null })
    return { gym, stats }
  }).catch(err => {
    cache.delete(gymId)
    throw err
  })

  cache.set(gymId, { ...(cached || {}), inflight: promise })
  return promise
}

export function useDashboardSnapshot() {
  const { gymId } = useAuth()
  const [snap, setSnap] = useState(() => {
    const c = gymId ? cache.get(gymId) : null
    return c?.gym && c?.stats ? { gym: c.gym, stats: c.stats } : { gym: null, stats: null }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!gymId) return
    let cancelled = false
    setLoading(true)
    loadSnapshot(gymId)
      .then(s => { if (!cancelled) setSnap(s) })
      .catch(err => console.warn('[dashboard-snapshot]', err.message))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  return { ...snap, loading }
}
