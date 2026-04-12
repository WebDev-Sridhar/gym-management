import { createContext, useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { fetchGymBySlug } from '../services/gymPublicService'

const GymContext = createContext(null)

export function GymProvider({ children }) {
  const { gymSlug } = useParams()
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
      .then((data) => {
        if (cancelled) return
        if (data) {
          setGym(data)
        } else {
          setError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
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
