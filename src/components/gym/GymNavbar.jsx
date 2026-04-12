import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useGym } from '../../store/GymContext'

export default function GymNavbar() {
  const { gym } = useGym()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!gym) return null

  const base = `/${gym.slug}`
  const links = [
    { to: base, label: 'Home', end: true },
    { to: `${base}/about`, label: 'About' },
    { to: `${base}/pricing`, label: 'Pricing' },
    { to: `${base}/trainers`, label: 'Trainers' },
  ]

  const themeColor = gym.theme_color || '#8B5CF6'

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo + Name */}
        <NavLink to={base} className="flex items-center gap-3">
          {gym.logo_url ? (
            <img
              src={gym.logo_url}
              alt={gym.name}
              className="w-9 h-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: themeColor }}
            >
              {gym.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-gray-900 text-lg hidden sm:block">
            {gym.name}
          </span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-gray-900 bg-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
