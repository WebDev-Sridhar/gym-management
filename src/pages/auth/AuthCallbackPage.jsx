import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { fetchUserProfile } from '../../services/userService'
import { useAuth } from '../../store/AuthContext'

/**
 * /auth/callback
 *
 * Supabase redirects here after a magic link click.
 * The URL hash contains the access_token + refresh_token.
 * Supabase JS client picks these up automatically via onAuthStateChange.
 *
 * Flow:
 *  1. Wait for Supabase to establish the session from the URL hash
 *  2. Check if user exists in the "users" table
 *  3. Existing user → redirect to role-based dashboard
 *  4. New user → redirect to /create-gym (onboarding)
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState('processing') // 'processing' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // Supabase automatically picks up the token from the URL hash
      // when using PKCE flow. For implicit/hash flow, we may need to
      // explicitly exchange the hash. getSession() handles both.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!session) {
        // Session not yet available — listen for auth state change
        // This handles the case where the token exchange is async
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              subscription.unsubscribe()
              await routeUser(newSession.user)
            }
          }
        )

        // Timeout after 10 seconds
        setTimeout(() => {
          subscription.unsubscribe()
          setStatus('error')
          setErrorMsg('Login timed out. Please try again.')
        }, 10000)

        return
      }

      // Session already available
      await routeUser(session.user)
    } catch (err) {
      console.error('Auth callback error:', err)
      setStatus('error')
      setErrorMsg(err.message || 'Something went wrong during login')
    }
  }

  async function routeUser(user) {
    try {
      // Refresh the AuthContext so it picks up the new session
      await refreshProfile()

      // Check if user has a profile in the users table
      const profile = await fetchUserProfile(user.id)

      if (profile) {
        // ── Existing user → redirect to their dashboard ──
        const roleRoutes = {
          owner: '/owner-dashboard',
          trainer: '/trainer-dashboard',
          member: '/member-app',
        }
        navigate(roleRoutes[profile.role] || '/owner-dashboard', { replace: true })
      } else {
        // ── New user → onboarding ──
        navigate('/create-gym', { replace: true })
      }
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
          <a
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Back to Login
          </a>
        </div>
      </div>
    )
  }

  // Processing state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Signing you in...</h2>
        <p className="text-sm text-gray-500">Please wait while we verify your login</p>
      </div>
    </div>
  )
}
