import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, CreditCard, ScrollText, Users, ShieldCheck,
} from 'lucide-react'
import { useAdminAuth } from '../store/AdminAuthContext'
import { canSeeNav, ROLE_LABELS } from '../lib/adminRbac'
import { adminPath } from '../lib/adminBase'

// Phase-1 nav. `key` is matched against canSeeNav for role visibility.
// `to` is built absolute + base-aware so links never append to the current path.
const NAV = [
  { key: 'overview',      to: adminPath(''),              label: 'Overview',      Icon: LayoutDashboard, end: true },
  { key: 'gyms',          to: adminPath('gyms'),          label: 'Gyms',          Icon: Building2 },
  { key: 'subscriptions', to: adminPath('subscriptions'), label: 'Subscriptions', Icon: CreditCard },
  { key: 'audit',         to: adminPath('audit'),         label: 'Audit Log',     Icon: ScrollText },
  { key: 'admins',        to: adminPath('admins'),        label: 'Admins',        Icon: Users },
]

export default function AdminSidebar({ onNavigate }) {
  const { admin, role } = useAdminAuth()

  return (
    <aside
      className="flex h-full w-60 flex-col border-r"
      style={{ background: 'var(--a-surface)', borderColor: 'var(--a-border)' }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--a-accent-soft)' }}>
          <ShieldCheck className="h-4.5 w-4.5" style={{ color: 'var(--a-accent)' }} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold" style={{ color: 'var(--a-text)' }}>Gymmobius</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--a-text-faint)' }}>Admin</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.filter((n) => canSeeNav(role, n.key)).map(({ to, label, Icon, end }) => (
          <NavLink
            key={to || 'index'}
            to={to}
            end={end}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={({ isActive }) => ({
              background: isActive ? 'var(--a-accent-soft)' : 'transparent',
              color: isActive ? 'var(--a-accent-text)' : 'var(--a-text-dim)',
            })}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--a-border)' }}>
        <p className="truncate text-xs font-medium" style={{ color: 'var(--a-text)' }}>{admin?.name || admin?.email}</p>
        <p className="text-[11px]" style={{ color: 'var(--a-text-faint)' }}>{ROLE_LABELS[role] || role}</p>
      </div>
    </aside>
  )
}
