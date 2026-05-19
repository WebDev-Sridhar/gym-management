import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { fetchBranches } from '../services/branchService'

const STORAGE_KEY = 'branch:selected'

function readSelected() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v || 'all'
  } catch { return 'all' }
}

function writeSelected(v) {
  try { localStorage.setItem(STORAGE_KEY, v) } catch {}
}

const BranchContext = createContext(null)

/**
 * Provides branch state inside the owner dashboard shell.
 *
 * - Owners pick which branch to view (or "all branches") via the Topbar
 *   switcher — selection is persisted to localStorage.
 * - Trainers (if this provider is ever mounted in their layout) and other
 *   pinned roles get `selectedBranchId` overridden to their `branch_id`
 *   from AuthContext — they can't switch.
 *
 * Single-branch gyms see no switcher (canSwitch && branches.length >= 2).
 *
 * Note: branch_id is currently exposed via the `users` profile row but the
 * AuthContext doesn't yet derive `branchId` — this provider falls back to
 * `profile?.branch_id` directly.
 */
export function BranchProvider({ children }) {
  const { gymId, role, profile } = useAuth()
  const pinnedBranch = profile?.branch_id ?? null

  const [branches, setBranches] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(readSelected)

  const reload = useCallback(async () => {
    if (!gymId) { setBranches([]); setLoading(false); return }
    setLoading(true)
    try {
      const rows = await fetchBranches(gymId)
      setBranches(rows)
    } catch (err) {
      console.warn('[BranchContext] fetchBranches failed:', err.message)
      setBranches([])
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => { reload() }, [reload])

  // If the selected branch was deleted (or owner just upgraded and selection
  // is stale), fall back to 'all'.
  useEffect(() => {
    if (loading) return
    if (selected === 'all') return
    if (!branches.some(b => b.id === selected)) {
      setSelected('all')
      writeSelected('all')
    }
  }, [branches, loading, selected])

  function selectBranch(branchId) {
    const v = branchId || 'all'
    setSelected(v)
    writeSelected(v)
  }

  const canSwitch = role === 'owner'
  const effectiveSelected = canSwitch ? selected : (pinnedBranch || 'all')

  const value = {
    branches,
    loading,
    selectedBranchId: effectiveSelected,
    isAllBranches:    effectiveSelected === 'all',
    canSwitch,
    selectBranch,
    reload,
  }

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return ctx
}

/**
 * Safe variant — returns a sensible default outside the provider so pages
 * that may render in both shells (owner + non-owner) don't blow up.
 */
export function useOptionalBranch() {
  const ctx = useContext(BranchContext)
  return ctx ?? {
    branches: [],
    loading: false,
    selectedBranchId: 'all',
    isAllBranches: true,
    canSwitch: false,
    selectBranch: () => {},
    reload: () => {},
  }
}
