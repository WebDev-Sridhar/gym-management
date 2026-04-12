import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

/**
 * PublicRoute redirects authenticated+onboarded users to their dashboard.
 * Used for /login and /onboarding so logged-in users don't see those pages.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated, isOnboarded, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated && isOnboarded) {
    const roleRoutes = {
      owner: '/owner-dashboard',
      trainer: '/trainer-dashboard',
      member: '/member-app',
    }
    return <Navigate to={roleRoutes[role] || '/'} replace />
  }

  return children
}
