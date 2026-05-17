import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, profile, role, gymId, loading, initialized } = useAuth()

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

  // Owner-specific onboarding gate
  if (role === 'owner') {
    const step = profile.onboarding_step
    if (!gymId || !step || step === 'started') {
      return <Navigate to="/create-gym" replace />
    }
    // Not yet subscribed (first-time onboarding) — send to billing flow
    if (step === 'gym_created' || step === 'setup_done') {
      return <Navigate to="/billing" replace />
    }
    // Subscription expired — stay in dashboard; upgrade banner handled in-app
  }

  // Role mismatch — send to the correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleRoutes = {
      owner: '/owner-dashboard',
      trainer: '/trainer-dashboard',
      member: '/member-app',
    }
    return <Navigate to={roleRoutes[role] || '/login'} replace />
  }

  return children
}
