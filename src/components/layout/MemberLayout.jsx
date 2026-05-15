import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ClipboardList, User } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { MemberDataProvider } from '../../store/MemberDataContext'
import { supabaseData as supabase } from '../../services/supabaseClient'
import ScreenShell from '../trainer/ScreenShell'

// Direct imports — no Outlet, no lazy loading
import MemberApp          from '../../pages/member/MemberApp'
import MemberWorkoutsPage from '../../pages/member/MemberWorkoutsPage'
import MemberProfilePage  from '../../pages/member/MemberProfilePage'

const NAV_ORDER = [
  '/member-app',
  '/member-app/workouts',
  '/member-app/profile',
]

const SCREENS = [
  { path: '/member-app',          label: 'Home',    Icon: Home,          Component: MemberApp },
  { path: '/member-app/workouts', label: 'Plans',   Icon: ClipboardList, Component: MemberWorkoutsPage },
  { path: '/member-app/profile',  label: 'Profile', Icon: User,          Component: MemberProfilePage },
]

function getActiveIdx(pathname) {
  const clean = pathname.replace(/\/$/, '')
  const idx = NAV_ORDER.indexOf(clean)
  return idx === -1 ? 0 : idx
}

export default function MemberLayout() {
  const { profile, gymId } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [gym, setGym] = useState(null)

  const visitedRef = useRef(new Set())
  const activeIdx = getActiveIdx(location.pathname)
  visitedRef.current.add(activeIdx)

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

  function goTo(path) {
    navigate(path, { replace: true })
  }

  return (
    <MemberDataProvider>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        minHeight: '100dvh',
        background: '#04050d',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: '100%',
          minHeight: '100dvh',
          background: '#080910',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.6)',
        }} className="md:max-w-[1080px]">

          {/* Header */}
          <header style={{
            background: 'rgba(8,9,16,0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {gym?.logo_url ? (
                <img src={gym.logo_url} alt={gym.name}
                  style={{ width: 32, height: 32, borderRadius: 10, objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
                    {gym?.name?.charAt(0).toUpperCase() || 'G'}
                  </span>
                </div>
              )}
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px' }}>
                {gym?.name || '…'}
              </span>
            </div>

            <button
              onClick={() => goTo('/member-app/profile')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'white',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {profile?.name?.charAt(0).toUpperCase() || 'M'}
            </button>
          </header>

          {/* Screen container */}
          <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {SCREENS.map(({ path, Component }, idx) => (
              <ScreenShell
                key={path}
                isActive={idx === activeIdx}
                idx={idx}
                activeIdx={activeIdx}
                hasBeenVisited={visitedRef.current.has(idx)}
              >
                <Component />
              </ScreenShell>
            ))}
          </main>

          {/* Bottom nav */}
          <nav style={{
            position: 'sticky',
            bottom: 0,
            background: 'rgba(8,9,16,0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: 50,
          }}>
            <div style={{ display: 'flex', padding: '8px 0' }}>
              {SCREENS.map(({ path, label, Icon }, idx) => {
                const isActive = idx === activeIdx
                return (
                  <button
                    key={path}
                    onClick={() => goTo(path)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3, padding: '4px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    <motion.span
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      style={{ color: isActive ? '#818cf8' : 'rgba(255,255,255,0.28)', display: 'block' }}
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                    </motion.span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#818cf8' : 'rgba(255,255,255,0.28)',
                      letterSpacing: '0.2px',
                    }}>
                      {label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-dot"
                        style={{
                          position: 'absolute', bottom: 6,
                          width: 4, height: 4, borderRadius: '50%',
                          background: '#818cf8',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </div>
    </MemberDataProvider>
  )
}
