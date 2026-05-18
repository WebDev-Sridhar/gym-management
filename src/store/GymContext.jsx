import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchGymBySlug, fetchGymBySubdomain, resolveSlugRedirect } from '../services/gymPublicService'
import { detectHost } from '../lib/host'

const GymContext = createContext(null)

/**
 * GymProvider — resolves a gym from EITHER the URL path (`/iron-paradise/...`)
 * or the host (`iron-paradise.gymmobius.app`, or a verified custom domain).
 *
 * Resolution order:
 *   1. host = subdomain → lookup by subdomain
 *   2. host = custom    → lookup by custom_domain (currently falls back to
 *                         slug — Phase 2 will add fetchGymByCustomDomain)
 *   3. host = main      → lookup by :gymSlug from useParams()
 *
 * In every case, a miss falls through to `resolveSlugRedirect` so old links
 * keep working after slug/subdomain renames.
 */
export function GymProvider({ children }) {
  const { gymSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Detected once — host doesn't change without a full page reload
  const hostInfo = useMemo(
    () => detectHost(typeof window !== 'undefined' ? window.location.hostname : ''),
    [],
  )

  // What we're trying to resolve THIS render (subdomain string OR slug from URL)
  const resolveKey = hostInfo.kind === 'subdomain' ? `sub:${hostInfo.subdomain}` : `slug:${gymSlug || ''}`

  useEffect(() => {
    // No identifier at all (e.g. main domain hit `/` with no slug) → 404
    if (hostInfo.kind === 'main' && !gymSlug) {
      setLoading(false); setError(true)
      return
    }

    // Skip re-fetch if we already have the right gym
    if (gym) {
      if (hostInfo.kind === 'subdomain' && gym.subdomain === hostInfo.subdomain) {
        setLoading(false); return
      }
      if (hostInfo.kind === 'main' && gym.slug === gymSlug) {
        setLoading(false); return
      }
    }

    setLoading(true)
    setError(false)

    let cancelled = false
    const fetcher =
      hostInfo.kind === 'subdomain'
        ? fetchGymBySubdomain(hostInfo.subdomain)
        : fetchGymBySlug(gymSlug)

    fetcher
      .then(async (data) => {
        if (cancelled) return
        if (data) {
          setGym(data)
          return
        }

        // Miss → try the redirect table (covers renames of slug OR subdomain)
        const lookupKey = hostInfo.kind === 'subdomain' ? hostInfo.subdomain : gymSlug
        const redirectTarget = await resolveSlugRedirect(lookupKey)
        if (cancelled) return

        if (redirectTarget) {
          if (hostInfo.kind === 'subdomain') {
            // Redirect to the new subdomain (cross-host = full URL)
            const protocol = window.location.protocol
            const port     = window.location.port ? `:${window.location.port}` : ''
            const restOfHost = window.location.hostname.slice(hostInfo.subdomain.length)
            window.location.replace(
              `${protocol}//${redirectTarget}${restOfHost}${port}${location.pathname}${location.search || ''}`,
            )
            return
          }
          // Main domain redirect — preserve any sub-path
          const subPath = location.pathname.slice(`/${gymSlug}`.length) || ''
          navigate(`/${redirectTarget}${subPath}${location.search || ''}`, { replace: true })
          return
        }

        setError(true)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveKey])

  return (
    <GymContext.Provider value={{ gym, loading, error, hostInfo }}>
      {children}
    </GymContext.Provider>
  )
}

export function useGym() {
  const context = useContext(GymContext)
  if (!context) {
    throw new Error('useGym must be used within a GymProvider')
  }
  return context
}
