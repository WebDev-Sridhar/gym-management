import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

/**
 * ProtectedRoute guards dashboard routes.
 *
 * Flow:
 * 1. Not authenticated → /signup
 * 2. Authenticated but not onboarded → /create-gym
 * 3. Owner without active subscription → /billing
 * 4. Wrong role → redirect to correct dashboard
 * 5. All good → render children
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isOnboarded, role, hasActiveSubscription, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/signup" replace />
  }

  // Logged in but hasn't completed onboarding
  if (!isOnboarded) {
    return <Navigate to="/create-gym" replace />
  }

  // Owner without active subscription → paywall
  if (role === 'owner' && !hasActiveSubscription) {
    return <Navigate to="/billing" replace />
  }

  // Role mismatch — redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    const roleRoutes = {
      owner: '/owner-dashboard',
      trainer: '/trainer-dashboard',
      member: '/member-app',
    }
    return <Navigate to={roleRoutes[role] || '/signup'} replace />
  }

  return children
}
