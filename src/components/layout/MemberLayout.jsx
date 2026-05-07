import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, ClipboardList, User } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { supabaseData as supabase } from '../../services/supabaseClient'

const S = {
  shell:    { fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#080910', minHeight: '100dvh', display: 'flex', flexDirection: 'column', width: '100%', position: 'relative' },
  header:   { background: 'rgba(8,9,16,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, width: '100%' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBadge:{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' },
  avatar:   { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' },
  main:     { flex: 1, overflowY: 'auto', paddingBottom: '76px' },
  nav:      { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,9,16,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 50 },
  navInner: { display: 'flex', padding: '8px 0' },
}

const navItems = [
  { to: '/member-app',          label: 'Home',    end: true,  Icon: Home },
  { to: '/member-app/workouts', label: 'Plans',   end: false, Icon: ClipboardList },
  { to: '/member-app/profile',  label: 'Profile', end: false, Icon: User },
]

export default function MemberLayout() {
  const { profile, gymId } = useAuth()
  const location = useLocation()
  const [gym, setGym] = useState(null)

  useEffect(() => {
    if (!document.getElementById('pjs-font')) {
      const l = document.createElement('link')
      l.id = 'pjs-font'; l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
      document.head.appendChild(l)
    }
  }, [])

  useEffect(() => {
    if (!gymId) return
    supabase.from('gyms').select('name, logo_url').eq('id', gymId).single()
      .then(({ data }) => { if (data) setGym(data) })
      .catch(() => {})
  }, [gymId])

  return (
    <div style={S.shell}>
      <header style={S.header}>
        <div style={S.logoWrap}>
          {gym?.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} />
          ) : (
            <div style={S.logoBadge}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>
                {gym?.name?.charAt(0).toUpperCase() || 'G'}
              </span>
            </div>
          )}
          <span style={S.logoText}>{gym?.name || '...'}</span>
        </div>
        <div style={S.avatar}>{profile?.name?.charAt(0).toUpperCase() || 'M'}</div>
      </header>

      <main style={S.main}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav style={S.nav}>
        <div style={S.navInner}>
          {navItems.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 0', textDecoration: 'none' }}>
              {({ isActive }) => (
                <>
                  <motion.span animate={{ scale: isActive ? 1.08 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    style={{ color: isActive ? '#818cf8' : 'rgba(255,255,255,0.28)', display: 'block' }}>
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                  </motion.span>
                  <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, color: isActive ? '#818cf8' : 'rgba(255,255,255,0.28)', letterSpacing: '0.2px' }}>
                    {label}
                  </span>
                  {isActive && (
                    <motion.span layoutId="nav-dot"
                      style={{ position: 'absolute', bottom: '6px', width: '4px', height: '4px', borderRadius: '50%', background: '#818cf8' }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
