import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import {
  LayoutDashboard, Users, UserCheck, QrCode, ClipboardList, CreditCard,
  BarChart2, Megaphone, MessageSquare, Settings, HelpCircle, Gem, Dumbbell,
} from 'lucide-react'

const sections = [
  {
    label: 'OVERVIEW',
    links: [
      { to: '/owner-dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'MEMBERS',
    links: [
      { to: '/owner-dashboard/members',  label: 'Members',  Icon: Users },
      { to: '/owner-dashboard/trainers', label: 'Trainers', Icon: UserCheck },
      { to: '/owner-dashboard/checkin',  label: 'Check-in', Icon: QrCode },
    ],
  },
  {
    label: 'MANAGE',
    links: [
      { to: '/owner-dashboard/plans',     label: 'Plans',     Icon: ClipboardList },
      { to: '/owner-dashboard/programs',  label: 'Programs',  Icon: Dumbbell },
      { to: '/owner-dashboard/payments',  label: 'Payments',  Icon: CreditCard },
      { to: '/owner-dashboard/analytics', label: 'Analytics', Icon: BarChart2 },
    ],
  },
  {
    label: 'COMMUNICATION',
    links: [
      { to: '/owner-dashboard/communication', label: 'Announcements', Icon: Megaphone },
      { to: '/owner-dashboard/messages',      label: 'Messages',      Icon: MessageSquare },
    ],
  },
  {
    label: 'SUPPORT',
    links: [
      { to: '/owner-dashboard/help', label: 'Help & Support', Icon: HelpCircle },
    ],
  },
  {
    label: 'SETTINGS',
    links: [
      { to: '/owner-dashboard/settings', label: 'Account & Settings', Icon: Settings },
    ],
  },
]

function SidebarLink({ to, label, Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
        ${isActive
          ? 'bg-indigo-500/15 text-indigo-300 border-l-[3px] border-indigo-400 pl-[9px]'
          : 'text-white/55 hover:text-white/90 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]'
        }`
      }
    >
      <Icon size={17} strokeWidth={1.9} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { subscription, gymName } = useAuth()

  const planName = subscription?.plan_name || 'Starter'

  return (
    <aside
      className="hidden lg:flex"
      style={{
        width: 240,
        height: '100%',
        background: 'var(--shell-bg)',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid var(--shell-border)',
      }}
    >
      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {sections.map(({ label, links }) => (
          <div key={label}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--shell-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingLeft: 12, marginBottom: 6 }}>
              {label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {links.map(link => (
                <SidebarLink key={link.label} {...link} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Premium card */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--shell-border)', flexShrink: 0 }}>
        <div style={{
          background: 'var(--p-tint)',
          border: '1px solid var(--p-glow)',
          borderRadius: 14,
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Gem size={16} color="var(--p-pale)" strokeWidth={2} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{gymName || 'My Gym'}</span>
          </div>
          <p style={{ color: 'var(--shell-muted)', fontSize: 11, marginBottom: 12 }}>{planName} Plan</p>
          <button
            onClick={() => navigate('/owner-dashboard/subscription')}
            style={{
              width: '100%', padding: '8px 0', border: '1px solid var(--p-glow)',
              borderRadius: 8, background: 'transparent', color: 'var(--p-pale)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Manage Subscription
          </button>
        </div>
      </div>
    </aside>
  )
}
