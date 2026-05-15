import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  fetchTrainerStats, fetchAssignedMembers,
  fetchGymWorkoutTemplates, fetchGymDietTemplates,
} from '../services/trainerService'

const TrainerDataContext = createContext(null)

export function TrainerDataProvider({ children }) {
  const { gymId, user } = useAuth()
  const [members,    setMembers]    = useState(null)
  const [stats,      setStats]      = useState(null)
  const [wTemplates, setWTemplates] = useState(null)
  const [dTemplates, setDTemplates] = useState(null)

  const loadingRef      = useRef({ core: false, templates: false })
  const templatesLoaded = useRef(false)

  // Eager: members + stats on mount / when gymId becomes available
  useEffect(() => {
    if (!gymId || !user?.id) return
    if (loadingRef.current.core) return
    loadingRef.current.core = true
    Promise.all([
      fetchTrainerStats(gymId, user.id),
      fetchAssignedMembers(gymId, user.id),
    ]).then(([s, m]) => {
      setStats(s)
      setMembers(m)
    }).catch(() => {
      setStats(s => s ?? { totalMembers: 0, activeToday: 0, plansAssigned: 0 })
      setMembers(m => m ?? [])
    }).finally(() => { loadingRef.current.core = false })
  }, [gymId, user?.id])

  // Lazy: templates — ref-based guard so useCallback is stable (deps=[gymId] only)
  const loadTemplates = useCallback(async () => {
    if (templatesLoaded.current) return
    if (loadingRef.current.templates) return
    if (!gymId) return
    loadingRef.current.templates = true
    try {
      const [w, d] = await Promise.all([
        fetchGymWorkoutTemplates(gymId),
        fetchGymDietTemplates(gymId),
      ])
      setWTemplates(w)
      setDTemplates(d)
      templatesLoaded.current = true
    } catch {
      setWTemplates(w => w ?? [])
      setDTemplates(d => d ?? [])
    } finally {
      loadingRef.current.templates = false
    }
  }, [gymId])

  const refreshMembers = useCallback(async () => {
    if (!gymId || !user?.id) return
    try {
      const m = await fetchAssignedMembers(gymId, user.id)
      setMembers(m)
    } catch {
      // silent — existing list stays
    }
  }, [gymId, user?.id])

  return (
    <TrainerDataContext.Provider value={{
      members,
      stats,
      wTemplates,
      dTemplates,
      loadTemplates,
      refreshMembers,
    }}>
      {children}
    </TrainerDataContext.Provider>
  )
}

export function useTrainerData() {
  const ctx = useContext(TrainerDataContext)
  if (!ctx) throw new Error('useTrainerData must be used within TrainerDataProvider')
  return ctx
}
