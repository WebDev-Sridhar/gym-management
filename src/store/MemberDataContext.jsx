import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { fetchMyMember, fetchMyAttendance, fetchMyActivePlans } from '../services/memberService'
import { fetchMyPendingPayment } from '../services/memberPaymentService'

const MemberDataContext = createContext(null)

export function MemberDataProvider({ children }) {
  const { gymId, profile } = useAuth()

  const [member,    setMember]    = useState(null)   // null while loading OR not found
  const [attendance, setAtt]      = useState(null)   // null while loading
  const [plans,     setPlans]     = useState(null)   // null while loading
  const [pending,   setPending]   = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadingRef = useRef(false)

  useEffect(() => {
    if (!gymId || !profile?.email && !profile?.phone) return
    if (loadingRef.current) return
    loadingRef.current = true

    fetchMyMember({ gymId, phone: profile.phone, email: profile.email })
      .then(async m => {
        setMember(m)
        if (m) {
          const [att, pl, pay] = await Promise.all([
            fetchMyAttendance({ memberId: m.id, limit: 90 }),
            fetchMyActivePlans(m.id),
            fetchMyPendingPayment(m.id).catch(() => null),
          ])
          setAtt(att)
          setPlans(pl)
          setPending(pay)
        } else {
          setAtt([])
          setPlans([])
        }
      })
      .catch(e => {
        setLoadError(e.message || 'Failed to load')
        setAtt([])
        setPlans([])
      })
      .finally(() => {
        loadingRef.current = false
        setIsLoading(false)
      })
  }, [gymId, profile?.phone, profile?.email])

  // Called after a successful check-in — prepends to shared attendance
  const addAttendance = useCallback((record) => {
    setAtt(prev => [record, ...(prev ?? [])])
  }, [])

  // Called after renewal success — updates member status + clears pending
  const refreshMember = useCallback(async () => {
    if (!gymId || !profile) return
    try {
      const m = await fetchMyMember({ gymId, phone: profile.phone, email: profile.email })
      setMember(m)
      if (m) {
        const pay = await fetchMyPendingPayment(m.id).catch(() => null)
        setPending(pay)
      }
    } catch { /* silent */ }
  }, [gymId, profile])

  return (
    <MemberDataContext.Provider value={{
      member, attendance, plans, pending, isLoading, loadError,
      setMember, setPending, addAttendance, refreshMember,
    }}>
      {children}
    </MemberDataContext.Provider>
  )
}

export function useMemberData() {
  const ctx = useContext(MemberDataContext)
  if (!ctx) throw new Error('useMemberData must be used within MemberDataProvider')
  return ctx
}
