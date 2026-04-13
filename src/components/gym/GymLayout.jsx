import { Outlet } from 'react-router-dom'
import { GymProvider, useGym } from '../../store/GymContext'
import GymNavbar from './GymNavbar'
import { getThemeCSSVars } from '../../lib/gymTheme'

export default function GymLayout() {
  return (
    <GymProvider>
      <GymLayoutInner />
    </GymProvider>
  )
}

function GymLayoutInner() {
  const { gym, loading, error } = useGym()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gym Not Found</h1>
          <p className="text-gray-500 text-sm mb-6">
            The gym you're looking for doesn't exist or may have been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors text-sm"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  const themeColor = gym.theme_color || '#8B5CF6'
  const themeVars = getThemeCSSVars(themeColor)
  const base = `/${gym.slug}`

  const footerLinks = [
    { to: base, label: 'Home' },
    { to: `${base}/about`, label: 'About' },
    { to: `${base}/pricing`, label: 'Pricing' },
    { to: `${base}/trainers`, label: 'Trainers' },
  ]

  return (
    <div
      className="min-h-screen bg-white"
      style={themeVars}
    >
      <GymNavbar />
      <main>
        <Outlet />
      </main>

      {/* Premium Footer */}
      <footer className="relative border-t border-gray-100">
        {/* Gradient accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: themeVars['--gym-gradient'] }}
        />

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                {gym.logo_url ? (
                  <img src={gym.logo_url} alt={gym.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: themeVars['--gym-primary'] }}
                  >
                    {gym.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-gray-900 text-lg">{gym.name}</span>
              </div>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                {gym.description || `Premium fitness facility${gym.city ? ` in ${gym.city}` : ''}. Transform your body, elevate your life.`}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Quick Links</h4>
              <ul className="space-y-2.5">
                {footerLinks.map((link) => (
                  <li key={link.to}>
                    <a href={link.to} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">Location</h4>
              {gym.city && (
                <p className="text-sm text-gray-500 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {gym.city}
                </p>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} {gym.name}. All rights reserved.
            </p>
            <p className="text-xs text-gray-300">
              Powered by <span className="font-medium text-gray-400">GymOS</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
