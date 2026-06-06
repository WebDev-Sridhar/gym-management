import { AdminAuthProvider } from './store/AdminAuthContext'
import { AdminThemeProvider } from './store/AdminThemeContext'
import AdminApp from './AdminApp'
import './admin.css'

/**
 * Entry point for the internal super-admin app. Kept separate from AdminApp so
 * App.jsx can lazy-load this single module (provider + routes + styles) as one
 * code-split chunk, with zero admin bytes in the tenant bundle.
 */
export default function AdminRoot() {
  return (
    <AdminThemeProvider>
      <AdminAuthProvider>
        <AdminApp />
      </AdminAuthProvider>
    </AdminThemeProvider>
  )
}
