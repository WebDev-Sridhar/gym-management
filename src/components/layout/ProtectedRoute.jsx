import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { nextRouteFor, roleHome } from '../../lib/onboarding'

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, profile, role, loading, initialized, gymSuspended, logout } = useAuth()

  // Block route decisions until the very first auth check has finished —
  // without this, a re-render between setSession() and loadProfile() could
  // briefly satisfy !profile → redirect to /create-gym.
  //
  // But for SUBSEQUENT loads (background refresh, tab refocus, post-login
  // refreshProfile), only show the spinner when we have no profile yet. If
  // we already have one, render the dashboard and let the background load
  // complete silently — otherwise email/pass login produced a visible
  // "skeleton → spinner → content" flash because refreshProfile flipped
  // loading=true after navigation completed.
  if (!initialized || (loading && !profile)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // No profile yet — brand new user who hasn't created a gym
  if (!profile) {
    return <Navigate to="/create-gym" replace />
  }

  // Gym suspended by platform staff — block everyone in the gym with a clear
  // message instead of a broken dashboard. (Public site enforcement is a
  // later phase; this covers the authenticated owner/trainer/member surfaces.)
  if (gymSuspended) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-gray-900">Account suspended</h1>
          <p className="mt-2 text-sm text-gray-600">
            Access to this gym is temporarily suspended. Please contact Gymmobius
            support to restore your account.
          </p>
          <a
            href="mailto:gymmobius.support@gmail.com"
            className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            Contact support
          </a>
          <button onClick={logout} className="mt-3 block w-full text-sm text-gray-500">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Owner-specific onboarding gate. nextRouteFor returns the path the user
  // should be at — if it's anything other than /owner-dashboard, they're
  // mid-onboarding and we bounce them to that step.
  if (role === 'owner') {
    const next = nextRouteFor(profile)
    if (next !== '/owner-dashboard') {
      return <Navigate to={next} replace />
    }
    // Subscription expired falls through (stays in dashboard, in-app banner)
  }

  // Role mismatch — send to the correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />
  }

  return children
}
