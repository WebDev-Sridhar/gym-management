import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, setAccessToken } from '../../services/supabaseClient'
import { fetchAdminProfile } from '../services/adminAuthService'

// Decode the AAL claim from a JWT locally (no auth-client call → no Navigator
// Lock). Used so the post-verify path can resolve assurance without touching
// supabase.auth.* (which deadlocks if called inside onAuthStateChange).
function aalFromToken(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return 'aal1'
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded))?.aal ?? 'aal1'
  } catch {
    return 'aal1'
  }
}

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
  // MFA assurance for the admin session: 'ok' (aal2) | 'challenge' (has a
  // verified factor, needs step-up) | 'enroll' (admin, no factor) | null.
  const [mfaStatus, setMfaStatus] = useState(null)
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
      (event, s) => {
        if (event === 'INITIAL_SESSION') return
        if (!initializedRef.current) return
        // setAccessToken is a plain local setter (no lock) — safe to run inline.
        setAccessToken(s?.access_token ?? null)
        if (event === 'TOKEN_REFRESHED') return
        // CRITICAL: this callback runs while supabase-js holds the auth
        // Navigator Lock. Calling any supabase.auth.* method here (loadAdmin →
        // computeMfa → getAuthenticatorAssuranceLevel) deadlocks. Defer with
        // setTimeout(0) to run AFTER the lock is released.
        setTimeout(() => {
          setSession(s)
          if (s?.user) loadAdmin(s.user.id)
          else { setAdmin(null); setMfaStatus(null); setLoading(false) }
        }, 0)
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
      if (a) await computeMfa()
      else setMfaStatus(null)
    } catch (err) {
      console.error('Failed to load admin profile:', err)
      setAdmin(null)
      setMfaStatus(null)
    } finally {
      setLoading(false)
    }
  }

  // Resolve the session's MFA assurance level. enroll = admin has no TOTP
  // factor yet; challenge = factor exists but session is still aal1; ok = aal2.
  async function computeMfa() {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error || !data) { setMfaStatus('enroll'); return }
      if (data.currentLevel === 'aal2') setMfaStatus('ok')
      else if (data.nextLevel === 'aal2') setMfaStatus('challenge')
      else setMfaStatus('enroll')
    } catch {
      setMfaStatus('enroll')
    }
  }

  // Refresh assurance after an MFA verify. The gate passes the session that
  // mfa.verify() returns so we can resolve AAL2 from the token locally — no
  // getSession()/auth call, which avoids Navigator Lock contention right after
  // the verify. Falls back to full detection only when no session is supplied.
  async function recheckMfa(newSession = null) {
    if (newSession?.access_token) {
      setSession(newSession)
      setAccessToken(newSession.access_token)
      if (aalFromToken(newSession.access_token) === 'aal2') { setMfaStatus('ok'); return }
    }
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    setAccessToken(s?.access_token ?? null)
    if (aalFromToken(s?.access_token) === 'aal2') { setMfaStatus('ok'); return }
    await computeMfa()
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
    setMfaStatus(null)
  }

  const value = {
    session,
    admin,
    role: admin?.role ?? null,
    loading,
    initialized,
    isAuthenticated: !!session,
    isAdmin: !!admin,
    mfaStatus,            // 'ok' | 'challenge' | 'enroll' | null
    mfaVerified: mfaStatus === 'ok',
    recheckMfa,
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
