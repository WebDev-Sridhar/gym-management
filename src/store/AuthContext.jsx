import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, setAccessToken } from '../services/supabaseClient'
import { fetchUserProfile, fetchSubscription } from '../services/userService'
import { signOut as authSignOut } from '../services/authService'
import { setSentryUser } from '../lib/sentry'
import { discardAllDrafts } from '../lib/cmsDraft'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  // True once the very first getSession()+loadProfile() cycle finishes.
  // One-way door — never goes back to false. Used by ProtectedRoute to
  // prevent rendering routes before auth has resolved even once.
  const [initialized, setInitialized] = useState(false)
  // Guard so getSession() and onAuthStateChange() don't both call loadProfile()
  const initializedRef = useRef(false)

  useEffect(() => {
    // Safety timeout: if loading is still true after 8s, force it false
    const safetyTimer = setTimeout(() => {
      setLoading(false)
      setInitialized(true)
    }, 8000)

    // Initialize auth: getSession() handles token refresh before returning,
    // so we always get a valid session if one exists.
    async function initAuth() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)
        setAccessToken(s?.access_token ?? null)
        if (s?.user) {
          await loadProfile(s.user.id)
        } else {
          setLoading(false)
        }
      } finally {
        clearTimeout(safetyTimer)
        initializedRef.current = true
        setInitialized(true)   // one-way door — routes are now safe to render
      }
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

      // "Neutered" profile detection — when an owner deletes a member, that
      // member's public.users row gets role=null, gym_id=null (the RPC keeps
      // the row alive to avoid CASCADE'ing away their members + payments
      // history). If we let the session continue, ProtectedRoute would
      // bounce them around with no clear destination. Force a clean logout.
      if (p && !p.role) {
        // Capture the last-known gym slug BEFORE clearing state so we can
        // send the deleted member back to the GYM's login page (not the
        // SaaS /login). Four sources, in order:
        //   1. Fresh row's gym_slug — already null here because gym_id was
        //      nulled by the delete RPC, so the join returns nothing.
        //   2. Current React state — populated on the previous successful
        //      load (covers the common "deleted mid-session" case).
        //   3. localStorage cache — fallback for "deleted, then reloaded
        //      the page" where React state was reset to null on remount.
        //   4. Current URL path — last-ditch slug extraction for legacy
        //      sessions that pre-date the localStorage cache, OR for users
        //      currently sitting on /{slug}/anything when the neuter fires.
        const currentPath = (typeof window !== 'undefined') ? window.location.pathname : '/'
        const pathSlugMatch = currentPath.match(/^\/([^/]+)(?:\/|$)/)
        const pathSlug = pathSlugMatch
          // Avoid grabbing reserved app paths as a "slug".
          && !['login', 'signup', 'auth', 'owner-dashboard', 'trainer-dashboard',
               'member-app', 'create-gym', 'onboarding', 'billing', 'checkin',
               'pay', 'features', 'pricing', 'demo', 'changelog', 'about', 'blog',
               'careers', 'contact', 'privacy', 'terms', 'security', 'refund-policy',
               'reset-password'].includes(pathSlugMatch[1])
          ? pathSlugMatch[1]
          : null

        const slug = p.gym_slug
          || profile?.gym_slug
          || (typeof window !== 'undefined' ? localStorage.getItem('gym:lastSlug') : null)
          || pathSlug

        // Already standing on a login page? Don't redirect — that creates
        // a re-login race where the page's own "not a member" inline error
        // never gets a chance to show. Just clean state in place and let
        // the page render its message.
        const onLoginPage = /\/login\/?$/.test(currentPath)

        // CRITICAL: synchronously purge Supabase's session tokens from
        // localStorage BEFORE any redirect. authSignOut() clears them
        // asynchronously — if we fire-and-forget it the browser unloads
        // the page first and the session lives on, so the next mount
        // re-reads it, re-detects the neuter, and redirects again → an
        // infinite reload loop the user can't escape (even closing the
        // tab + reopening hits the same loop because localStorage
        // survives).
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('gym:lastSlug')
            for (const key of Object.keys(localStorage)) {
              if (key.startsWith('sb-')) localStorage.removeItem(key)
            }
          } catch { /* ignore */ }
        }
        // authSignOut runs in the background to revoke the refresh token
        // server-side; we don't await it because tokens are already purged
        // locally above, and any setState we'd do after awaiting would
        // re-render React before the browser navigates.
        authSignOut().catch(() => { /* ignore */ })

        if (onLoginPage) {
          // We're already on a login page → no navigation needed. DO clear
          // React state so the page (GymLoginPage) sees a fresh profile
          // and renders its own inline "not a member" error.
          setAccessToken(null)
          setSession(null)
          setProfile(null)
          setSubscription(null)
        } else if (typeof window !== 'undefined') {
          // Navigate FIRST — and crucially, DON'T call any setState below
          // it. React's re-render would otherwise schedule synchronously
          // (microtask) before the browser actually unloads, letting
          // ProtectedRoute fire <Navigate to="/login"/> off the cleared
          // session and flash the SaaS /login page for a tick. By leaving
          // React state untouched, isAuthenticated stays true until the
          // browser swaps to the new page — no flash. The next page mount
          // starts AuthContext from scratch and finds no session (tokens
          // already purged above), so it loads cleanly.
          const target = slug ? `/${slug}/login` : '/login'
          window.location.replace(target)
        }
        return
      }

      // Cache the slug on every successful load so the neuter-redirect
      // fallback (above) works even after a page reload that wiped the
      // React state. Cleared on intentional logout + on neuter.
      if (typeof window !== 'undefined' && p?.gym_slug) {
        try { localStorage.setItem('gym:lastSlug', p.gym_slug) } catch { /* ignore */ }
      }

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
      // V3 launch fix: attach the logged-in user to Sentry's scope so
      // captured errors include who/which-gym. No-op when Sentry isn't
      // initialized (local dev without VITE_SENTRY_DSN).
      if (p?.id) {
        setSentryUser({
          id:      p.id,
          email:   p.email ?? undefined,
          gym_id:  p.gym_id ?? undefined,
          role:    p.role ?? undefined,
        })
      } else {
        setSentryUser(null)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
      setProfile(null)
      setSubscription(null)
      setSentryUser(null)
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
    // Drop CMS drafts + their pending temp uploads BEFORE auth state clears,
    // so re-login on the same browser doesn't resurrect a stale editor with
    // images pointing at orphaned storage files. Best-effort: failures are
    // caught by the daily cleanup-temp-images cron.
    const gymIdForCleanup = profile?.gym_id
    if (gymIdForCleanup) {
      try { await discardAllDrafts(gymIdForCleanup) } catch { /* silent */ }
    }
    // Drop the gym-slug breadcrumb (only used by the neuter-redirect path)
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('gym:lastSlug') } catch { /* ignore */ }
    }
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
    initialized,
    logout,
    refreshProfile,
    // Derived helpers
    isAuthenticated: !!session,
    onboardingStep: profile?.onboarding_step ?? null,
    isOnboarded: profile?.onboarding_step === 'subscribed',
    role: profile?.role ?? null,
    gymId: profile?.gym_id ?? null,
    gymName: profile?.gym_name ?? null,
    gymSlug: profile?.gym_slug ?? null,   // used by member/trainer apps to route logout → /{slug}/login
    // Platform-admin suspension — when staff suspend a gym, every member of
    // that gym (owner/trainer/member) is blocked at ProtectedRoute.
    gymSuspended: profile?.gym_status === 'suspended',
    // Trainer's pinned branch (null for owners — they use BranchContext to switch)
    branchId: profile?.branch_id ?? null,
    // V3 P0 lifecycle: status is the dominant signal — never report active
    // for a row the cron has marked expired/cancelled, even if expires_at
    // somehow drifts to the future (manual SQL edit during testing, clock
    // skew, etc.). The expires_at gate catches the inverse case: row still
    // says 'active' but the date has passed and the hourly cron hasn't run
    // yet (covers the up-to-59 minute window).
    hasActiveSubscription: !!subscription
      && subscription.status !== 'expired'
      && subscription.status !== 'cancelled'
      && new Date(subscription.expires_at) > new Date(),
    // V3 Task 10: trial-state helpers consumed by DashboardLayout banner,
    // SubscriptionPage countdown, and BillingPage "convert" copy.
    // trialDaysLeft is floored — a trial ending in 23h 59m shows 0 (it's
    // the last day, not 1 day).
    isTrial:    subscription?.status === 'trial',
    trialDaysLeft: subscription?.status === 'trial' && subscription?.expires_at
      ? Math.max(0, Math.floor((new Date(subscription.expires_at) - new Date()) / 86_400_000))
      : null,
    // V3 P0 lifecycle: distinct "expired" flag for the dashboard strip and
    // bannerConfig predicate. True only for rows the expire-stale-records
    // cron has flipped to 'expired' (paid subs past their window). Trial
    // and free + active (Solo Coach) intentionally don't qualify.
    isExpired: subscription?.status === 'expired',
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
