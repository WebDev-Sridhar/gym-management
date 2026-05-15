import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Users, Dumbbell, User } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import { TrainerDataProvider } from '../../store/TrainerDataContext'
import { supabaseData as supabase } from '../../services/supabaseClient'
import ScreenShell from '../trainer/ScreenShell'

// Direct imports — no Outlet, no lazy loading
import TrainerDashboard    from '../../pages/trainer/TrainerDashboard'
import TrainerMembersPage  from '../../pages/trainer/TrainerMembersPage'
import TrainerWorkoutsPage from '../../pages/trainer/TrainerWorkoutsPage'
import TrainerSettingsPage from '../../pages/trainer/TrainerSettingsPage'

// Canonical tab order — index position drives slide direction
const NAV_ORDER = [
  '/trainer-dashboard',
  '/trainer-dashboard/members',
  '/trainer-dashboard/workouts',
  '/trainer-dashboard/settings',
]

const SCREENS = [
  { path: '/trainer-dashboard',          label: 'Home',     Icon: Home,     Component: TrainerDashboard },
  { path: '/trainer-dashboard/members',  label: 'Members',  Icon: Users,    Component: TrainerMembersPage },
  { path: '/trainer-dashboard/workouts', label: 'Workouts', Icon: Dumbbell, Component: TrainerWorkoutsPage },
  { path: '/trainer-dashboard/settings', label: 'Profile',  Icon: User,     Component: TrainerSettingsPage },
]

function getActiveIdx(pathname) {
  // Strip trailing slash to avoid index-0 mismatch
  const clean = pathname.replace(/\/$/, '')
  const idx = NAV_ORDER.indexOf(clean)
  return idx === -1 ? 0 : idx
}

export default function TrainerLayout() {
  const { profile, gymId } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [gym, setGym] = useState(null)

  // visitedRef tracks which screen indices have been rendered at least once.
  // Using a ref (not state) so marking a screen visited never causes a re-render.
  const visitedRef = useRef(new Set())
  const activeIdx = getActiveIdx(location.pathname)
  visitedRef.current.add(activeIdx)  // mark synchronously before the map runs

  // Load Plus Jakarta Sans once
  useEffect(() => {
    if (!document.getElementById('pjs-font-trainer')) {
      const l = document.createElement('link')
      l.id = 'pjs-font-trainer'; l.rel = 'stylesheet'
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
    // replace:true — tab hops don't stack in browser history.
    // Back button goes to the page before /trainer-dashboard, not a previous tab.
    navigate(path, { replace: true })
  }

  return (
    <TrainerDataProvider>
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

          {/* ── Header ─────────────────────────────────────────────────────── */}
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

            {/* Avatar → settings tab */}
            <button
              onClick={() => goTo('/trainer-dashboard/settings')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: 'white',
                border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {profile?.name?.charAt(0).toUpperCase() || 'T'}
            </button>
          </header>

          {/* ── Screen container — overflow:hidden clips off-screen panels ── */}
          {/* NOTE: do not add position:sticky children inside screens —       */}
          {/* overflow:hidden on this element breaks inner sticky positioning. */}
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

          {/* ── Bottom nav ─────────────────────────────────────────────────── */}
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
                        layoutId="trainer-nav-dot"
                        style={{
                          position: 'absolute', top: 0,
                          width: 20, height: 3, borderRadius: 99,
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
    </TrainerDataProvider>
  )
}
