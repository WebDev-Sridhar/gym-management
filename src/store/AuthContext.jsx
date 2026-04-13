import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, setAccessToken } from '../services/supabaseClient'
import { fetchUserProfile, fetchSubscription } from '../services/userService'
import { signOut as authSignOut } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  // Guard so getSession() and onAuthStateChange() don't both call loadProfile()
  const initializedRef = useRef(false)

  useEffect(() => {
    // Safety timeout: if loading is still true after 8s, force it false
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 8000)

    // Initialize auth: getSession() handles token refresh before returning,
    // so we always get a valid session if one exists.
    async function initAuth() {
      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)
      // Cache the access token for the data client
      setAccessToken(s?.access_token ?? null)
      if (s?.user) {
        await loadProfile(s.user.id)
      } else {
        setLoading(false)
      }
      clearTimeout(safetyTimer)
      initializedRef.current = true
    }

    initAuth()

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        // Skip INITIAL_SESSION — we handle it via getSession() above
        if (event === 'INITIAL_SESSION') return
        // Skip events until getSession() has finished
        if (!initializedRef.current) return

        // Always update the cached token — even on TOKEN_REFRESHED
        setAccessToken(s?.access_token ?? null)

        // Skip token refreshes for React state — the data client already
        // has the new token via setAccessToken above. No need to re-render.
        if (event === 'TOKEN_REFRESHED') return

        setSession(s)
        if (s?.user) {
          await loadProfile(s.user.id)
        } else {
          setProfile(null)
          setSubscription(null)
          setLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(safetyTimer)
      authSub.unsubscribe()
    }
  }, [])

  async function loadProfile(authId) {
    // Only show full-page spinner on initial load, not on background
    // token refreshes (which happen when switching tabs)
    if (!initializedRef.current) setLoading(true)
    try {
      const p = await fetchUserProfile(authId)

      // If owner, fetch subscription BEFORE updating state to avoid
      // a flash where profile is set but subscription is still null
      // (ProtectedRoute would briefly redirect to /billing)
      let sub = null
      if (p?.role === 'owner' && p?.gym_id) {
        try {
          sub = await fetchSubscription(p.gym_id)
        } catch (subErr) {
          console.error('Failed to load subscription:', subErr)
        }
      }

      // Set profile and subscription together so ProtectedRoute
      // never sees an intermediate state
      setProfile(p)
      setSubscription(sub)
    } catch (err) {
      console.error('Failed to load profile:', err)
      setProfile(null)
      setSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    // Get session fresh from Supabase instead of relying on React state,
    // which may be stale (e.g. AuthCallbackPage calls this before
    // onAuthStateChange has updated the context's session state)
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (currentSession?.user) {
      setSession(currentSession)
      setAccessToken(currentSession.access_token)
      setLoading(true)
      await loadProfile(currentSession.user.id)
    }
  }

  async function logout() {
    // Clear cached token immediately so data client stops working
    setAccessToken(null)
    // signOut can hang if Navigator Lock is held — use a timeout fallback
    try {
      await Promise.race([
        authSignOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 3000)),
      ])
    } catch {
      // If signOut timed out or failed, clear local storage manually
      // so the user is effectively logged out on the client side
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      }
    }
    setSession(null)
    setProfile(null)
    setSubscription(null)
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    subscription,
    loading,
    logout,
    refreshProfile,
    // Derived helpers
    isAuthenticated: !!session,
    isOnboarded: !!profile,
    role: profile?.role ?? null,
    gymId: profile?.gym_id ?? null,
    hasActiveSubscription: !!subscription && new Date(subscription.expires_at) > new Date(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
