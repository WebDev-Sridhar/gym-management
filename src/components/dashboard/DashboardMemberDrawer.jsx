import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import MemberDrawer from '../ui/MemberDrawer'
import { fetchPlans } from '../../services/membershipService'
import { fetchTrainers } from '../../services/trainerService'
import { supabaseData as supabase } from '../../services/supabaseClient'

/**
 * DashboardMemberDrawer — opens the full MemberDrawer from the dashboard given
 * just a member id. MemberDrawer needs the full member row + the gym's plans +
 * trainers, none of which the dashboard snapshot carries, so we lazy-load them.
 *
 * No loading spinner: we render nothing until the data is ready, then the
 * drawer slides straight in. plans + trainers are cached per gym (they rarely
 * change), so only the single member row is fetched on each open — making
 * repeat opens effectively instant.
 */
const AUX_TTL = 5 * 60 * 1000
const auxCache = new Map() // gymId → { plans, trainers, at }

export default function DashboardMemberDrawer({ memberId, gymId, onClose, onChanged }) {
  const [member, setMember] = useState(null)
  const cached = gymId ? auxCache.get(gymId) : null
  const cacheFresh = cached && Date.now() - cached.at < AUX_TTL
  const [aux, setAux] = useState(cacheFresh ? cached : { plans: [], trainers: [] })

  useEffect(() => {
    if (!memberId || !gymId) return
    let cancelled = false

    supabase
      .from('members')
      .select('*, plan:plans(id, name, price, duration_days)')
      .eq('id', memberId)
      .single()
      .then(({ data }) => { if (!cancelled) setMember(data || null) })

    if (!cacheFresh) {
      Promise.all([fetchPlans(gymId).catch(() => []), fetchTrainers(gymId).catch(() => [])])
        .then(([plans, trainers]) => {
          const v = { plans: plans || [], trainers: trainers || [], at: Date.now() }
          auxCache.set(gymId, v)
          if (!cancelled) setAux(v)
        })
    }
    return () => { cancelled = true }
  }, [memberId, gymId, cacheFresh])

  // Render nothing until the member row is ready — the drawer then appears
  // fully populated (no spinner flash).
  if (!member) return null

  return (
    <AnimatePresence>
      <MemberDrawer
        key="dash-drawer"
        member={member}
        gymId={gymId}
        plans={aux.plans}
        trainers={aux.trainers}
        defaultTab="Info"
        onClose={onClose}
        onUpdated={() => onChanged?.()}
        onDeleted={() => { onChanged?.(); onClose() }}
      />
    </AnimatePresence>
  )
}
