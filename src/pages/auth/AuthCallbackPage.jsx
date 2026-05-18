import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import {
  fetchUserProfile,
  createUserProfile,
  findMemberByEmail,
  findTrainerInviteByEmail,
  claimTrainerInvite,
  createTrainerRecord,
} from '../../services/userService'
import { useAuth } from '../../store/AuthContext'
import BrandLoader from '../../components/ui/BrandLoader'

export default function AuthCallbackPage() {
  const [status, setStatus]   = useState('processing') // 'processing' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const navigate    = useNavigate()
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

      if (!profile) {
        // ── Auto-detect member or trainer by email ──────────────────────────
        if (user.email) {
          // 1. Check if this email belongs to a gym member
          const memberRecord = await findMemberByEmail(user.email)
          if (memberRecord) {
            await createUserProfile({
              authId: user.id,
              name: memberRecord.name,
              email: user.email,
              phone: memberRecord.phone || null,
              role: 'member',
              gymId: memberRecord.gym_id,
            })
            await refreshProfile()
            navigate('/member-app', { replace: true })
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
        }

        // 3. Email isn't a member or trainer-invite — treat as a fresh owner.
        //
        // Covers two cases:
        //   a) Brand-new signup just confirmed their email — they haven't
        //      hit /create-gym yet, so no profile exists yet.
        //   b) Owner whose gym row was deleted (manual cleanup, account
        //      deletion, etc.) and CASCADE removed their users row. The
        //      auth.users record persists; they can recreate their gym.
        //
        // Either way, /create-gym is the right destination. CreateGymPage
        // checks for an existing profile and skips itself if present, so
        // the eventual "completed" user gets redirected onward correctly.
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

  return (
    <BrandLoader
      fullScreen
      title="Signing you in"
      subtitle="Setting up your workspace — this only takes a moment."
    />
  )
}
