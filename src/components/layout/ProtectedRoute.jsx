import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { nextRouteFor, roleHome } from '../../lib/onboarding'

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, profile, role, loading, initialized } = useAuth()

  // Block ALL route decisions until the first auth check finishes.
  // Without this, a re-render between setSession() and loadProfile()
  // completing can briefly satisfy !profile → redirect to /create-gym.
  if (!initialized || loading) {
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
