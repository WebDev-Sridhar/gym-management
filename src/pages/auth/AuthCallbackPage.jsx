import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { fetchGymBySlug, fetchGymById } from '../../services/gymPublicService'
import {
  fetchUserProfile,
  createUserProfile,
  findMemberByEmail,
  findMemberByPhone,
  findTrainerInviteByEmail,
  claimTrainerInvite,
  createTrainerRecord,
} from '../../services/userService'
import { useAuth } from '../../store/AuthContext'
import BrandLoader from '../../components/ui/BrandLoader'

export default function AuthCallbackPage() {
  const [status, setStatus]     = useState('processing') // 'processing' | 'error' | 'notMember'
  const [errorMsg, setErrorMsg] = useState('')
  const [unknownGym, setUnknownGym] = useState(null)     // { name, slug, theme_color } when notMember
  const navigate    = useNavigate()
  const [searchParams] = useSearchParams()
  // Optional gym context — set by GymJoinPage when the signup happened on a
  // gym's own join page. Used to render a friendly "not a member of {gym}"
  // screen instead of silently routing strangers to the owner onboarding.
  const gymSlug   = searchParams.get('gym')
  const returnTo  = searchParams.get('return')
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

      await routeUser(session.user)
    } catch (err) {
      console.error('Auth callback error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Something went wrong during login')
    }
  }

  async function routeUser(user) {
    try {
      await refreshProfile()
      const profile = await fetchUserProfile(user.id)

      // Safe-URL guard for ?return= (mirrors GymLoginPage's safeReturnUrl).
      const safeReturn = (() => {
        if (!returnTo || typeof returnTo !== 'string') return null
        if (!returnTo.startsWith('/')) return null
        if (returnTo.startsWith('//') || returnTo.includes('\\')) return null
        return returnTo
      })()

      // Pre-resolve the gym they signed up FOR (if context tag present) so we
      // can detect "member of a different gym" cases below.
      let requestedGym = null
      if (gymSlug) {
        try { requestedGym = await fetchGymBySlug(gymSlug) } catch { /* ignore */ }
      }

      if (!profile) {
        // ── Auto-detect member or trainer by email ──────────────────────────
        if (user.email) {
          // 1. Check if this email belongs to a gym member
          const memberRecord = await findMemberByEmail(user.email)
          if (memberRecord) {
            // Cross-gym mismatch: they signed up at /{gymSlug}/join but their
            // member row is in a different gym. Don't silently link to the
            // wrong tenant — show a "you're a member of X, not Y" screen.
            if (requestedGym && memberRecord.gym_id !== requestedGym.id) {
              const actualGym = await fetchGymById(memberRecord.gym_id).catch(() => null)
              if (actualGym) {
                setUnknownGym({
                  name: requestedGym.name,
                  slug: requestedGym.slug,
                  theme_color: requestedGym.theme_color || '#8B5CF6',
                  logo_url: requestedGym.logo_url || null,
                  // Extra hint: where they SHOULD log in
                  belongsTo: { name: actualGym.name, slug: actualGym.slug },
                })
                setStatus('notMember')
                return
              }
              // Fall through if the other gym lookup failed — better to link
              // them somewhere than block them with no recourse.
            }

            await createUserProfile({
              authId: user.id,
              name: memberRecord.name,
              email: user.email,
              phone: memberRecord.phone || null,
              role: 'member',
              gymId: memberRecord.gym_id,
            })
            await refreshProfile()
            navigate(safeReturn || '/member-app', { replace: true })
            return
          }

          // 2. Check if this email matches an unclaimed trainer invite
          const trainerInvite = await findTrainerInviteByEmail(user.email)
          if (trainerInvite) {
            await createUserProfile({
              authId: user.id,
              name: trainerInvite.name,
              email: user.email,
              phone: trainerInvite.phone || null,
              role: 'trainer',
              gymId: trainerInvite.gym_id,
            })
            await Promise.all([
              claimTrainerInvite(trainerInvite.id),
              createTrainerRecord({ authId: user.id, gymId: trainerInvite.gym_id }),
            ])
            await refreshProfile()
            navigate('/trainer-dashboard', { replace: true })
            return
          }

          // 2b. Phone-based fallback. Many Indian gyms add members by phone
          //     only (no email on the member row). If GymJoinPage stashed a
          //     phone in user_metadata, try matching that to a member row.
          const metaPhone = user.user_metadata?.phone
          if (metaPhone) {
            const phoneMatch = await findMemberByPhone(metaPhone)
            if (phoneMatch) {
              // Cross-gym guard reused from email path.
              if (requestedGym && phoneMatch.gym_id !== requestedGym.id) {
                const actualGym = await fetchGymById(phoneMatch.gym_id).catch(() => null)
                if (actualGym) {
                  setUnknownGym({
                    name: requestedGym.name,
                    slug: requestedGym.slug,
                    theme_color: requestedGym.theme_color || '#8B5CF6',
                    logo_url: requestedGym.logo_url || null,
                    belongsTo: { name: actualGym.name, slug: actualGym.slug },
                  })
                  setStatus('notMember')
                  return
                }
              }
              await createUserProfile({
                authId: user.id,
                name: phoneMatch.name,
                email: user.email,
                phone: phoneMatch.phone || metaPhone,
                role: 'member',
                gymId: phoneMatch.gym_id,
              })
              // Backfill the email onto the member row so the owner sees the
              // newly-linked email next to the phone in MembersPage.
              await supabase.from('members')
                .update({ email: user.email })
                .eq('id', phoneMatch.id)
                .is('email', null)
                .catch(() => {})
              await refreshProfile()
              navigate(safeReturn || '/member-app', { replace: true })
              return
            }
          }
        }

        // 3a. Email/phone don't match any member or trainer-invite, AND they
        //     came from a gym join page (?gym=<slug> in the URL). Show a
        //     friendly "we couldn't find you" screen — don't silently route
        //     them into the owner-onboarding wizard which would be jarring UX.
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
          } catch {
            // gym lookup failed — fall through to owner onboarding rather
            // than block the user entirely on an infra hiccup
          }
        }

        // 3b. No gym context — treat as a fresh owner. Covers:
        //   a) Brand-new signup just confirmed their email — they haven't
        //      hit /create-gym yet, so no profile exists yet.
        //   b) Owner whose gym row was deleted (manual cleanup, account
        //      deletion, etc.) and CASCADE removed their users row. The
        //      auth.users record persists; they can recreate their gym.
        navigate('/create-gym', { replace: true })
        return
      }

      // ── Existing user — route by role ────────────────────────────────────
      if (profile.role === 'owner') {
        const step = profile.onboarding_step
        if (step === 'subscribed') {
          navigate('/owner-dashboard', { replace: true })
        } else if (step === 'setup_done' || step === 'gym_created') {
          navigate('/billing', { replace: true })
        } else {
          navigate('/create-gym', { replace: true })
        }
        return
      }

      const roleRoutes = {
        trainer: '/trainer-dashboard',
        member: '/member-app',
      }
      navigate(roleRoutes[profile.role] || '/owner-dashboard', { replace: true })
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

            <p className="text-[11px] text-gray-400 mt-5 pt-4 border-t border-gray-100">
              Looking to start your own gym instead?{' '}
              <a href="/create-gym" className="text-violet-600 font-medium hover:text-violet-800">
                Create a gym
              </a>
            </p>
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
