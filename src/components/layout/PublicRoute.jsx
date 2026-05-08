import { Navigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'

const ROLE_HOME = {
  owner:   '/owner-dashboard',
  trainer: '/trainer-dashboard',
  member:  '/member-app',
}

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
    return <Navigate to={ROLE_HOME[role] ?? '/owner-dashboard'} replace />
  }

  return children
}
