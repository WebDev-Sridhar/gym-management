import { Menu, LogOut, RefreshCw, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../store/AdminAuthContext'
import { useAdminTheme } from '../store/AdminThemeContext'
import { adminPath } from '../lib/adminBase'

export default function AdminTopbar({ onMenu, onRefresh, refreshing }) {
  const { logout } = useAdminAuth()
  const { isLight, toggle } = useAdminTheme()
  const navigate = useNavigate()
  async function handleLogout() {
    await logout()
    navigate(adminPath(''), { replace: true })
  }
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3"
      style={{ background: 'var(--a-bg)', borderColor: 'var(--a-border)' }}
    >
      <button onClick={onMenu} className="admin-hover rounded-md p-1.5 md:hidden" aria-label="Menu">
        <Menu className="h-5 w-5" style={{ color: 'var(--a-text-dim)' }} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="admin-hover rounded-lg border p-1.5"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          title={isLight ? 'Dark mode' : 'Light mode'}
        >
          {isLight ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="admin-hover inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
        <button
          onClick={handleLogout}
          className="admin-hover inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs"
          style={{ borderColor: 'var(--a-border-strong)', color: 'var(--a-text-dim)' }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </header>
  )
}
