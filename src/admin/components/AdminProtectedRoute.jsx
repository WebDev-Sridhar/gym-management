import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../store/AdminAuthContext'
import AdminLoginPage from '../pages/AdminLoginPage'
import { adminPath } from '../lib/adminBase'
import { ShieldAlert, LogOut } from 'lucide-react'

/**
 * Gate for every admin route. Renders the login screen when signed out, a
 * "Not authorized" wall when authenticated but not a platform admin, and the
 * spinner until the first auth resolution completes.
 */
export default function AdminProtectedRoute({ children }) {
  const { initialized, loading, isAuthenticated, isAdmin, logout } = useAdminAuth()
  const navigate = useNavigate()
  const signOut = async () => { await logout(); navigate(adminPath(''), { replace: true }) }

  if (!initialized || (loading && !isAdmin)) {
    return (
      <div className="app-admin flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) return <AdminLoginPage />

  if (!isAdmin) {
    return (
      <div className="app-admin flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-amber-400" />
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--a-text)' }}>Not authorized</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--a-text-dim)' }}>
            This account is signed in but is not a Gymmobius platform admin.
          </p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text)' }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    )
  }

  return children
}
