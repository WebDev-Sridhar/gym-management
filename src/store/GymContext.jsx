import { createContext, useContext, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { fetchGymBySlug, resolveSlugRedirect } from '../services/gymPublicService'

const GymContext = createContext(null)

export function GymProvider({ children }) {
  const { gymSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [gym, setGym] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!gymSlug) {
      setLoading(false)
      setError(true)
      return
    }

    // Don't re-fetch if we already have data for this slug
    if (gym?.slug === gymSlug) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(false)

    let cancelled = false
    fetchGymBySlug(gymSlug)
      .then(async (data) => {
        if (cancelled) return
        if (data) {
          setGym(data)
          return
        }

        // Direct slug missed — check redirect table. Owner may have renamed.
        const redirectTarget = await resolveSlugRedirect(gymSlug)
        if (cancelled) return

        if (redirectTarget) {
          // Preserve any sub-path (about/pricing/...) when redirecting
          const subPath = location.pathname.slice(`/${gymSlug}`.length) || ''
          navigate(`/${redirectTarget}${subPath}${location.search || ''}`, { replace: true })
          return
        }

        setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymSlug])

  return (
    <GymContext.Provider value={{ gym, loading, error }}>
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
