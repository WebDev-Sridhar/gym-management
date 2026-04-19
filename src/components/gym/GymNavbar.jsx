import { useState, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGym } from '../../store/GymContext'

export default function GymNavbar() {
  const { gym } = useGym()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!gym) return null

  const isDark = (gym.theme_mode || 'dark') !== 'light'
  const base = `/${gym.slug}`

  // Home page has a full-height dark photo hero → transparent navbar with white text is fine.
  // All other pages have a light surface hero in light mode → navbar must be solid from the start.
  const isHomePage = location.pathname === base || location.pathname === `${base}/`

  // In light mode: always use the "scrolled" (frosted light) appearance on non-home pages,
  // even before the user scrolls. Home page still starts transparent (over dark photo hero).
  const isLightScrolled = !isDark && (scrolled || !isHomePage)

  const links = [
    { to: base, label: 'Home', end: true },
    { to: `${base}/about`, label: 'About' },
    { to: `${base}/pricing`, label: 'Pricing' },
    { to: `${base}/trainers`, label: 'Trainers' },
    { to: `${base}/contact`, label: 'Contact' },
  ]

  // Show solid/frosted bg when: scrolled (any mode) OR light mode on non-home page
  const showSolidBg = scrolled || isLightScrolled

  const navBg = showSolidBg
    ? isDark ? 'rgba(8,8,8,0.92)' : 'rgba(250,250,250,0.97)'
    : 'transparent'

  const navBorder = showSolidBg
    ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`
    : '1px solid transparent'

  // Text color: transparent nav (over dark hero) → always white
  //             scrolled dark mode                → white
  //             scrolled light mode               → dark themed
  const textColor      = isLightScrolled ? 'var(--gym-text)'           : 'white'
  const textMutedColor = isLightScrolled ? 'var(--gym-text-secondary)'  : 'rgba(255,255,255,0.55)'
  const hoverBg        = isLightScrolled ? 'rgba(0,0,0,0.05)'           : 'rgba(255,255,255,0.05)'
  const activeBg       = isLightScrolled ? 'rgba(0,0,0,0.08)'           : 'rgba(255,255,255,0.10)'

  return (
    <>
      <motion.nav
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{ background: navBg, backdropFilter: showSolidBg ? 'blur(20px)' : 'none', borderBottom: navBorder }}
      >
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between" style={{ height: '72px' }}>
          {/* Logo */}
          <Link to={base} className="flex items-center gap-3 group">
            {gym.logo_url ? (
              <img src={gym.logo_url} alt={gym.name} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'var(--gym-gradient)' }}>
                {gym.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-display text-lg tracking-wider group-hover:opacity-80 transition-opacity"
              style={{ color: textColor }}>
              {gym.name.toUpperCase()}
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="px-4 py-2 text-sm font-sans transition-all duration-200 rounded-lg"
                style={({ isActive }) => ({
                  color: isActive ? textColor : textMutedColor,
                  background: isActive ? activeBg : 'transparent',
                })}
                onMouseEnter={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = hoverBg }}
                onMouseLeave={e => { if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'transparent' }}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to={`${base}/pricing`}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'var(--gym-gradient)' }}
            >
              Join Now
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 transition-colors cursor-pointer"
              style={{ color: textMutedColor }}
            >
              <div className="w-6 flex flex-col gap-[5px]">
                <motion.span
                  animate={mobileOpen ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
                  className="block h-[1.5px] w-full bg-current origin-center"
                />
                <motion.span
                  animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
                  className="block h-[1.5px] w-full bg-current"
                />
                <motion.span
                  animate={mobileOpen ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
                  className="block h-[1.5px] w-full bg-current origin-center"
                />
              </div>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed top-[72px] left-0 right-0 z-40 px-4 pb-4"
            style={{
              background: isDark ? 'rgba(8,8,8,0.97)' : 'rgba(250,250,250,0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
            }}
          >
            <div className="py-3 space-y-1">
              {links.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-sans rounded-lg transition-colors"
                  style={({ isActive }) => ({
                    color: isActive
                      ? isDark ? 'white' : 'var(--gym-text)'
                      : isDark ? 'rgba(255,255,255,0.55)' : 'var(--gym-text-secondary)',
                    background: isActive
                      ? isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
                      : 'transparent',
                  })}
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="pt-2">
                <Link
                  to={`${base}/pricing`}
                  onClick={() => setMobileOpen(false)}
                  className="block text-center px-4 py-3 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'var(--gym-gradient)' }}
                >
                  Join Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
