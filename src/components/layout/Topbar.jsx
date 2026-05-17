import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { fetchContactMessages, markMessageRead, markAllMessagesRead } from '../../services/contactService'
import {
  Home, ChevronDown, Bell, LayoutDashboard, CreditCard, Globe, Menu,
  Settings, LogOut, User, Gem, CheckCircle2, AlertCircle, Clock, HelpCircle,
  Sun, Moon,
} from 'lucide-react'
import { useTheme } from '../../store/ThemeContext'

const NAV_LINKS = [
  { to: '/owner-dashboard/home',            label: 'Home',          Icon: Home },
  { to: '/owner-dashboard',                  label: 'Dashboard',     Icon: LayoutDashboard, end: true },
  { to: '/owner-dashboard/payment-settings', label: 'Payment Setup', Icon: CreditCard },
  { to: '/owner-dashboard/website',          label: 'Website',       Icon:Globe },
]

function timeAgo(iso) {
  if (!iso) return ''
  const s = iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10) ? iso : iso + 'Z'
  const ms = Date.now() - new Date(s).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function statusConfig(status) {
  if (status === 'active')  return { label: 'Active',  Icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' }
  if (status === 'pending') return { label: 'Pending', Icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' }
  return                           { label: 'Inactive',Icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200' }
}

export default function Topbar({ onMenuToggle }) {
  const navigate  = useNavigate()
  const { gymId, role, profile, subscription, gymName, logout } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const isOwner   = role === 'owner'

  const [enquiries, setEnquiries]     = useState([])
  const [panelOpen, setPanelOpen]     = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const panelRef   = useRef(null)
  const profileRef = useRef(null)

  const loadEnquiries = useCallback(async () => {
    if (!gymId || !isOwner) return
    try {
      const msgs = await fetchContactMessages(gymId)
      setEnquiries(msgs)
    } catch { /* silent */ }
  }, [gymId, isOwner])

  useEffect(() => { loadEnquiries() }, [loadEnquiries])

  useEffect(() => {
    if (!isOwner) return
    const id = setInterval(loadEnquiries, 60000)
    return () => clearInterval(id)
  }, [loadEnquiries, isOwner])

  useEffect(() => {
    if (!panelOpen) return
    function onDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [panelOpen])

  useEffect(() => {
    if (!profileOpen) return
    function onDown(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [profileOpen])

  async function handleLogout() {
    setProfileOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleClearAll() {
    await markAllMessagesRead(gymId).catch(() => {})
    setEnquiries(prev => prev.map(e => ({ ...e, read: true })))
  }

  async function handleEnquiryClick(msg) {
    if (!msg.read) {
      await markMessageRead(msg.id).catch(() => {})
      setEnquiries(prev => prev.map(e => e.id === msg.id ? { ...e, read: true } : e))
    }
    setPanelOpen(false)
    navigate('/owner-dashboard/messages')
  }

  const visible  = enquiries.filter(e => !e.read)
  const unread   = visible.length
  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <>
      <header style={{
        height: 64,
        background: 'var(--shell-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 30,
        position: 'relative',
        borderBottom: '1px solid var(--shell-border)',
      }}>

        {/* Left — Hamburger (mobile) + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
          <button
            className="flex md:hidden"
            onClick={onMenuToggle}
            style={{ background: 'none', border: 'none', color: 'var(--shell-text)', cursor: 'pointer', padding: '4px 6px', alignItems: 'center', borderRadius: 8 }}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none' }} />
          <span className="hidden sm:block" style={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.4px' }}>Gymmobius</span>
        </div>

        {/* Center — Nav pills (hidden on mobile, shown md+) */}
        <div className="hidden md:flex">
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--shell-surface)',
            borderRadius: 12,
            padding: '4px',
          }}>
            {NAV_LINKS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={label}
                to={to}
                end={end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: isActive ? 'var(--p)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--shell-muted)',
                })}
              >
                {Icon && <Icon size={14} strokeWidth={2} />}
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right — Bell + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 160, justifyContent: 'flex-end' }}>

          {/* Bell */}
          {isOwner && (
            <button
              onClick={() => setPanelOpen(v => !v)}
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--shell-text)', display: 'flex' }}
            >
              <Bell size={20} strokeWidth={1.8} />
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 16, height: 16, padding: '0 4px',
                  background: 'var(--c-danger)', color: '#fff', fontSize: 9, fontWeight: 700,
                  borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )}

          {/* User — profile dropdown trigger */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--p-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div className="hidden sm:block" style={{ lineHeight: 1.2, textAlign: 'left' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{profile?.name?.split(' ')[0] || 'Owner'}</p>
                <p style={{ color: 'var(--shell-muted)', fontSize: 11, margin: 0, textTransform: 'capitalize' }}>{profile?.role || 'Owner'}</p>
              </div>
              <ChevronDown
                className="hidden sm:block"
                size={14} color="var(--shell-faint)" strokeWidth={2}
                style={{ transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Profile dropdown */}
            {profileOpen && (() => {
              const sub = subscription
              const sc  = statusConfig(sub?.status || 'inactive')
              const { Icon: StatusIcon } = sc
              const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null
              const daysLeft  = expiresAt ? Math.ceil((expiresAt - new Date()) / 86400000) : null

              return (
                <div data-profile-dropdown style={{
                  position: 'absolute', top: 'calc(100% + 14px)', right: -20,
                  width: 280, background: '#fff', borderRadius: 16,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb',
                  overflow: 'hidden', zIndex: 100,
                }}>
                  {/* Account header */}
                  <div style={{ padding: '18px 18px 14px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--p-gradient)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#fff',
                        boxShadow: '0 4px 12px var(--p-glow)',
                      }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile?.name || 'Owner'}
                        </p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile?.email || profile?.phone || '—'}
                        </p>
                        <div className='flex gap-1 items-center'>
                               <span style={{
                          display: 'inline-block', marginTop: 5,
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '2px 8px', borderRadius: 20,
                          background: 'var(--p-tint)', color: 'var(--p)',
                        }}>
                          {profile?.role || 'Owner'}
                        </span>
                        {gymName && (
                          <p style={{ fontSize: 11, color: 'var(--p)', margin: '3px 0 0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {gymName}
                          </p>
                        )}
                   
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan & status */}
                  {sub && (
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Gem size={14} color="var(--p)" strokeWidth={2} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{sub.plan_name || 'Plan'}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sc.color} ${sc.bg} ${sc.border}`}>
                          <StatusIcon size={10} strokeWidth={2.5} />
                          {sc.label}
                        </span>
                      </div>
                      {daysLeft !== null && (
                        <p style={{ fontSize: 11, color: daysLeft <= 7 ? '#d97706' : '#9ca3af', margin: 0 }}>
                          {daysLeft > 0
                            ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                            : 'Subscription expired'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ padding: '6px 8px' }}>
                    {[
                      { Icon: User,     label: 'Account Settings',     action: () => { setProfileOpen(false); navigate('/owner-dashboard/settings') } },
                      { Icon: Gem,      label: 'Manage Subscription',  action: () => { setProfileOpen(false); navigate('/owner-dashboard/subscription') } },
                      { Icon: HelpCircle, label: 'Help Center',        action: () => { setProfileOpen(false); navigate('/owner-dashboard/help') } },
                    ].map(({ Icon: ItemIcon, label, action }) => (
                      <button key={label} onClick={action} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 10, border: 'none', background: 'none',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        color: '#374151', fontSize: 13, fontWeight: 500,
                        transition: 'background 0.12s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <ItemIcon size={15} strokeWidth={1.9} color="#9ca3af" />
                        {label}
                      </button>
                    ))}

                    {/* Dark mode toggle row */}
                    <button
                      onClick={toggleTheme}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 10, border: 'none', background: 'none',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        color: '#374151', fontSize: 13, fontWeight: 500,
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {isDark
                        ? <Sun  size={15} strokeWidth={1.9} color="#9ca3af" />
                        : <Moon size={15} strokeWidth={1.9} color="#9ca3af" />
                      }
                      <span style={{ flex: 1 }}>{isDark ? 'Light mode' : 'Dark mode'}</span>
                      <span
                        aria-hidden
                        style={{
                          position: 'relative', width: 28, height: 16, borderRadius: 9999,
                          background: isDark ? '#4f46e5' : '#d1d5db',
                          transition: 'background 0.18s',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 2, left: 2,
                          width: 12, height: 12, borderRadius: 9999, background: '#fff',
                          transform: isDark ? 'translateX(12px)' : 'translateX(0)',
                          transition: 'transform 0.18s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        }} />
                      </span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div data-divider-top style={{ padding: '6px 8px 10px', borderTop: '1px solid #f3f4f6' }}>
                    <button onClick={handleLogout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 10, border: 'none', background: 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      color: 'var(--c-danger)', fontSize: 13, fontWeight: 600,
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <LogOut size={15} strokeWidth={2} color="var(--c-danger)" />
                      Sign out
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </header>

      {/* Notification panel */}
      {isOwner && (
        <>
          {panelOpen && (
            <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setPanelOpen(false)} />
          )}

          <div
            ref={panelRef}
            className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: panelOpen ? 'translateX(0)' : 'translateX(100%)' }}
          >
            {/* Panel header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <Bell size={18} className="text-indigo-600" strokeWidth={2} />
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <button onClick={() => setPanelOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bell size={22} className="text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-gray-500">All caught up</p>
                  <p className="text-xs text-gray-400">No new notifications.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {visible.map(msg => (
                    <button key={msg.id} onClick={() => handleEnquiryClick(msg)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 bg-indigo-50/50">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0 mt-0.5">
                        {msg.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm truncate font-semibold text-gray-900">{msg.name}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(msg.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{msg.email}</p>
                        <p className="text-xs text-gray-400 truncate mt-1">{msg.message}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex flex-col gap-2">
              {visible.length > 0 && (
                <button onClick={handleClearAll}
                  className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                  Clear all
                </button>
              )}
              <button
                onClick={() => { setPanelOpen(false); navigate('/owner-dashboard/messages') }}
                className="w-full py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                View all messages →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
