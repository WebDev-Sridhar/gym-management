import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, setAccessToken } from '../../services/supabaseClient'
import { fetchAdminProfile } from '../services/adminAuthService'

/**
 * Auth context for the INTERNAL super-admin app. Reuses the same Supabase Auth
 * session + the shared data-client token cache (setAccessToken) as the tenant
 * app, but resolves the caller against platform_admins — NOT public.users.
 *
 * A user who is authenticated but not an active platform admin gets
 * { isAuthenticated: true, admin: null } → the login screen shows
 * "Not authorized".
 */
const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const safety = setTimeout(() => { setLoading(false); setInitialized(true) }, 8000)

    async function init() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)
        setAccessToken(s?.access_token ?? null)
        if (s?.user) await loadAdmin(s.user.id)
        else setLoading(false)
      } finally {
        clearTimeout(safety)
        initializedRef.current = true
        setInitialized(true)
      }
    }
    init()

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (event === 'INITIAL_SESSION') return
        if (!initializedRef.current) return
        setAccessToken(s?.access_token ?? null)
        if (event === 'TOKEN_REFRESHED') return
        setSession(s)
        if (s?.user) await loadAdmin(s.user.id)
        else { setAdmin(null); setLoading(false) }
      },
    )

    return () => { clearTimeout(safety); authSub.unsubscribe() }
  }, [])

  async function loadAdmin(authId) {
    // Always flag loading while we resolve the platform_admins row. Without
    // this, after sign-in `isAuthenticated` is true but `admin` is still null
    // for the duration of the lookup → ProtectedRoute briefly shows the
    // "Not authorized" wall before the admin profile arrives.
    setLoading(true)
    try {
      const a = await fetchAdminProfile(authId)
      setAdmin(a)
    } catch (err) {
      console.error('Failed to load admin profile:', err)
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data.session)
    setAccessToken(data.session?.access_token ?? null)
    await loadAdmin(data.user.id)
    return data
  }

  async function logout() {
    setAccessToken(null)
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('signOut timeout')), 3000)),
      ])
    } catch {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      }
    }
    setSession(null)
    setAdmin(null)
  }

  const value = {
    session,
    admin,
    role: admin?.role ?? null,
    loading,
    initialized,
    isAuthenticated: !!session,
    isAdmin: !!admin,
    login,
    logout,
    refresh: () => session?.user && loadAdmin(session.user.id),
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
