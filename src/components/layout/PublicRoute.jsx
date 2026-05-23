import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { roleHome } from '../../lib/onboarding'

export default function PublicRoute({ children }) {
  const { loading, initialized, isAuthenticated, role } = useAuth()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated && role) {
    return <Navigate to={roleHome(role)} replace />
  }

  return children
}
