import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, setAccessToken } from '../../services/supabaseClient'
import {
  fetchGymBySlug,
  fetchGymBySubdomain,
  fetchGymByCustomDomain,
} from '../../services/gymPublicService'
import { fetchUserProfile } from '../../services/userService'
import { linkInviteOrMember } from '../../services/auth/linkInviteOrMember'
import { useAuth } from '../../store/AuthContext'
import { nextRouteFor } from '../../lib/onboarding'
import { detectHost } from '../../lib/host'
import BrandLoader from '../../components/ui/BrandLoader'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('processing') // 'processing' | 'error' | 'notMember'
  const [errorMsg, setErrorMsg] = useState('')
  const [unknownGym, setUnknownGym] = useState(null)     // { name, slug, theme_color } when notMember
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Optional gym context — set by GymJoinPage when the signup happened on a
  // gym's own join page. Used to render a friendly "not a member of {gym}"
  // screen instead of silently routing strangers to the owner onboarding.
  const gymSlug = searchParams.get('gym')
  const returnTo = searchParams.get('return')
  const { refreshProfile } = useAuth()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (!session) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              subscription.unsubscribe()
              // Seed the data-client token BEFORE routeUser. AuthContext's
              // own listener also fires SIGNED_IN but the ordering between
              // it and us isn't guaranteed — if we run first and call any
              // supabaseData query, RLS would reject under the anon-key
              // fallback. See Blocker #1 for the same race in LoginPage.
              setAccessToken(newSession.access_token)
              await routeUser(newSession.user)
            }
          }
        )
        setTimeout(() => {
          subscription.unsubscribe()
          setStatus('error')
          setErrorMsg('Login timed out. Please try again.')
        }, 10000)
        return
      }

      // Seed BEFORE routeUser — routeUser → linkInviteOrMember →
      // fetchUserProfile uses supabaseData. Without this, the Google OAuth
      // flow briefly mis-routed existing owners to /create-gym because
      // fetchUserProfile returned null under the anon-key fallback (Phase 0
      // changed empty-token to fall back to anon instead of empty Bearer).
      // AuthContext.initAuth ALSO seeds in parallel, but the order between
      // its useEffect and ours isn't deterministic — seed defensively here.
      setAccessToken(session.access_token)
      await routeUser(session.user)
    } catch (err) {
      console.error('Auth callback error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Something went wrong during login')
    }
  }

  async function routeUser(user) {
    try {
      // Safe-URL guard for ?return= (mirrors GymLoginPage's safeReturnUrl).
      const safeReturn = (() => {
        if (!returnTo || typeof returnTo !== 'string') return null
        if (!returnTo.startsWith('/')) return null
        if (returnTo.startsWith('//') || returnTo.includes('\\')) return null
        return returnTo
      })()

      // Pre-resolve the gym they signed up FOR (if context tag present) so
      // we can detect "member of a different gym" cases via cross_gym_*.
      // Falls back to host-derived resolution on tenant origins so cross-gym
      // detection works for callbacks that don't carry an explicit ?gym tag
      // (e.g. a future Google-OAuth button on a tenant host).
      let requestedGym = null
      if (gymSlug) {
        try { requestedGym = await fetchGymBySlug(gymSlug) } catch { /* ignore */ }
      }
      if (!requestedGym && typeof window !== 'undefined') {
        const hostInfo = detectHost(window.location.hostname)
        try {
          if (hostInfo.kind === 'subdomain') {
            requestedGym = await fetchGymBySubdomain(hostInfo.subdomain)
          } else if (hostInfo.kind === 'custom') {
            requestedGym = await fetchGymByCustomDomain(hostInfo.host)
          }
        } catch { /* ignore — fall through to no expected gym */ }
      }

      // Shared link logic: find existing profile, or try email-member,
      // trainer-invite, phone-member fallback, with cross-gym detection.
      const result = await linkInviteOrMember(user, {
        expectedGymId: requestedGym?.id,
        supportPhoneFallback: true,
      })

      // Cross-gym match — show the branded "wrong gym portal" screen.
      if (result.kind === 'cross_gym_member' || result.kind === 'cross_gym_trainer') {
        if (requestedGym && result.actualGym) {
          setUnknownGym({
            name: requestedGym.name,
            slug: requestedGym.slug,
            theme_color: requestedGym.theme_color || '#8B5CF6',
            logo_url: requestedGym.logo_url || null,
            belongsTo: { name: result.actualGym.name, slug: result.actualGym.slug },
          })
          setStatus('notMember')
          return
        }
        // actualGym lookup failed — fall through to the no_match path below
        // so the user isn't blocked entirely on an infra hiccup.
      }

      // No match + came from a gym join page → branded "verified but not a
      // member" screen. No match + no gym context → fresh-owner onboarding
      // (also catches owners whose gym was cascade-deleted).
      if (result.kind === 'no_match' || result.kind === 'cross_gym_member' || result.kind === 'cross_gym_trainer') {
        if (gymSlug) {
          try {
            const gym = await fetchGymBySlug(gymSlug)
            if (gym) {
              setUnknownGym({
                name: gym.name,
                slug: gym.slug,
                theme_color: gym.theme_color || '#8B5CF6',
                logo_url: gym.logo_url || null,
              })
              setStatus('notMember')
              return
            }
          } catch { /* fall through to owner onboarding */ }
        }
        navigate('/create-gym', { replace: true })
        return
      }

      // result.kind is 'existing' | 'linked_member' | 'linked_trainer' →
      // sync the AuthContext with the (possibly new) profile, then route.
      await refreshProfile()
      const profile = result.profile || await fetchUserProfile(user.id)

      // Members honor ?return= for deep-link flows (e.g. QR check-in).
      if (profile?.role === 'member' && safeReturn) {
        navigate(safeReturn, { replace: true })
        return
      }
      navigate(nextRouteFor(profile), { replace: true })
    } catch (err) {
      console.error('Route user error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Failed to load your profile')
    }
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Login failed</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <a href="/login" className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm">
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  // Gym-aware "you're verified but not on this gym's member list" screen.
  // Shown when a signup came from /{gymSlug}/join with an email we can't
  // match to a member row or trainer invite. Stops strangers from being
  // silently funnelled into the owner-onboarding wizard.
  if (status === 'notMember' && unknownGym) {
    const brand = unknownGym.theme_color
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          {unknownGym.logo_url ? (
            <img src={unknownGym.logo_url} alt={unknownGym.name}
              className="w-16 h-16 rounded-2xl object-cover mx-auto mb-6" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6"
              style={{ background: brand }}>
              {unknownGym.name?.charAt(0).toUpperCase() || 'G'}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            {unknownGym.belongsTo ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Wrong gym portal</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Your email is registered as a member of <span className="font-semibold text-gray-700">{unknownGym.belongsTo.name}</span>, not <span className="font-semibold text-gray-700">{unknownGym.name}</span>.
                </p>
                <a
                  href={`/${unknownGym.belongsTo.slug}/login`}
                  className="inline-flex items-center justify-center w-full py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                  style={{ background: brand }}
                >
                  Sign in to {unknownGym.belongsTo.name}
                </a>
                <a
                  href={`/${unknownGym.slug}/pricing`}
                  className="block text-center text-sm font-medium mt-3 hover:opacity-80 transition-opacity"
                  style={{ color: brand }}
                >
                  Or join {unknownGym.name} instead
                </a>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">You're verified, but not a member yet</h2>
                <p className="text-sm text-gray-500 mb-5">
                  We couldn't find you on <span className="font-semibold text-gray-700">{unknownGym.name}</span>'s member list.
                  Pick a plan to join, or ask the gym to add you manually.
                </p>
                <a
                  href={`/${unknownGym.slug}/pricing`}
                  className="inline-flex items-center justify-center w-full py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
                  style={{ background: brand }}
                >
                  View {unknownGym.name} plans
                </a>
                <a
                  href={`/${unknownGym.slug}/contact`}
                  className="block text-center text-sm font-medium mt-3 hover:opacity-80 transition-opacity"
                  style={{ color: brand }}
                >
                  Contact the gym
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <BrandLoader
      fullScreen
      title="Signing you in"
      subtitle="Setting up your workspace — this only takes a moment."
    />
  )
}
