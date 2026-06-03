import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import SupportWidget from '../support/SupportWidget'
import { BranchProvider } from '../../store/BranchContext'
import {
  X, Home, LayoutDashboard, CreditCard, Globe,
  Users, UserCheck, QrCode, ClipboardList, BarChart2,
  Megaphone, Settings, UserCircle, Gem, MessageSquare, HelpCircle, FolderKanban,
  MapPin, Sparkles, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { canAccess, planDisplayName } from '../../lib/featureGates'

// V3 P0 lifecycle: tiny inline formatter for the expired-strip date.
// Defined here to avoid importing the heavier date util just for one
// "DD Mon" rendering.
function fmtExpiredDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const SIDEBAR_BG = 'var(--shell-bg)'

const MOBILE_NAV_SECTIONS = [
  {
    label: 'MAIN',
    links: [
      { to: '/owner-dashboard/home',            label: 'Home',          Icon: Home },
      { to: '/owner-dashboard',                  label: 'Dashboard',     Icon: LayoutDashboard, end: true },
      { to: '/owner-dashboard/payment-settings', label: 'Payment Setup', Icon: CreditCard },
      { to: '/owner-dashboard/website',          label: 'Website',       Icon: Globe },
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
      { to: '/owner-dashboard/programs',  label: 'Programs',  Icon: FolderKanban },
      { to: '/owner-dashboard/payments',  label: 'Payments',  Icon: CreditCard },
      { to: '/owner-dashboard/analytics', label: 'Analytics', Icon: BarChart2 },
      { to: '/owner-dashboard/branches',  label: 'Branches',  Icon: MapPin, feature: 'multi_branch' },
    ],
  },
  {
    label: 'COMMUNICATION',
    links: [
      { to: '/owner-dashboard/communication', label: 'Announcements', Icon: Megaphone },
      { to: '/owner-dashboard/messages', label: 'Messages', Icon: MessageSquare},
    ],
  },
  {
    label: 'SUPPORT & SETTINGS',
    links: [
      { to: '/owner-dashboard/help',     label: 'Help & Support',     Icon: HelpCircle },
      { to: '/owner-dashboard/settings', label: 'Account & Settings', Icon: Settings },
    ],
  },
]

export default function DashboardLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const navigate = useNavigate()
  const { subscription, gymName, isTrial, trialDaysLeft, isExpired } = useAuth()

  const planName = subscription?.plan_name || 'Starter'

  return (
    <BranchProvider>
      <div className="app-owner flex flex-col h-screen overflow-hidden" style={{ background: 'var(--app-canvas-bg)' }}>

        {/* Topbar — always full-width, no layout shift */}
        <Topbar onMenuToggle={() => setMobileNavOpen(v => !v)} />

        {/* V3 Task 10: trial countdown strip. Only renders during an
            active trial (status='trial'). Copy escalates as days run
            out — day 7 amber, day 3 red, day 0 "ending today". CTA
            sends to /subscription where the owner picks a paid plan. */}
        {isTrial && (
          <div
            className={`shrink-0 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm border-b ${
              trialDaysLeft <= 3   ? 'bg-red-50 border-red-200 text-red-800'   :
              trialDaysLeft <= 7   ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                     'bg-violet-50 border-violet-200 text-violet-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={14} className="shrink-0" />
              <span className="font-medium truncate">
                {trialDaysLeft === 0
                  ? 'Trial ends today'
                  : trialDaysLeft === 1
                    ? 'Trial ends tomorrow'
                    : `Trial: ${trialDaysLeft} days left`}
              </span>
            </div>
            <Link
              to="/owner-dashboard/subscription"
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              Pick a plan
            </Link>
          </div>
        )}

        {/* V3 P0 lifecycle: expired-subscription strip. Always red,
            non-dismissible. Mirrors the trial strip pattern so it sits in
            the same visual slot. Surfaces the lapsed plan name + expiry
            date + Renew CTA so the owner can't miss it. Solo Coach
            (free + active) and trial states are intentionally excluded. */}
        {isExpired && (
          <div className="shrink-0 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm border-b bg-red-50 border-red-200 text-red-800">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={14} className="shrink-0" />
              <span className="font-medium truncate">
                Your {planDisplayName(subscription?.plan_name)} subscription expired
                {subscription?.expires_at ? ` on ${fmtExpiredDate(subscription.expires_at)}` : ''}.
                New WhatsApp, members, and branches are blocked until you renew.
              </span>
            </div>
            <Link
              to="/owner-dashboard/subscription"
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              Renew
            </Link>
          </div>
        )}

        {/* Sidebar + content row below the topbar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          {/* Extra bottom padding so the floating SupportWidget (~56px button
              at bottom-5/right-5) doesn't overlap pagination or bottom-anchored
              page content. The pb-24/pb-28 buffer applies across every owner
              page since main is the shared scroll container. */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-28 inset-0">
            <Outlet />
          </main>
        </div>

        {/* ── Mobile nav drawer ── */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Drawer panel */}
            <aside
              className="relative flex flex-col overflow-y-auto no-scrollbar"
              style={{ width: 280, background: SIDEBAR_BG, height: '100%' }}
            >
              {/* Drawer header */}
              <div style={{
                height: 64, padding: '0 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--shell-border)', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src="/logo.png" alt="Logo"
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.4px' }}>
                    Gymmobius
                  </span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--shell-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Nav sections */}
              <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {MOBILE_NAV_SECTIONS.map(({ label, links }) => {
                  const visible = links.filter(l => !l.feature || canAccess(l.feature, planName))
                  if (visible.length === 0) return null
                  return (
                  <div key={label}>
                    <p style={{
                      fontSize: 10, fontWeight: 700,
                      color: 'var(--shell-faint)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      paddingLeft: 12, marginBottom: 6,
                    }}>
                      {label}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {visible.map(({ to, label: lbl, Icon, end }) => (
                        <NavLink
                          key={lbl}
                          to={to}
                          end={end}
                          onClick={() => setMobileNavOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer
                            ${isActive
                              ? 'bg-indigo-500/15 text-indigo-300 border-l-[3px] border-indigo-400 pl-[9px]'
                              : 'text-white/55 hover:text-white/90 hover:bg-white/5 border-l-[3px] border-transparent pl-[9px]'
                            }`
                          }
                        >
                          <Icon size={17} strokeWidth={1.9} />
                          <span>{lbl}</span>
                        </NavLink>
                      ))}
                      
                    </div>

                  </div>
                  )
                })}
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
                        onClick={() => {navigate('/owner-dashboard/subscription');setMobileNavOpen(false)}}
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
          </div>
        )}

        {/* Floating support widget — visible across all owner-dashboard pages */}
        <SupportWidget />

      </div>
    </BranchProvider>
  )
}
