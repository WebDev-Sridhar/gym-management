import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { GymProvider, useGym } from '../../store/GymContext'
import GymNavbar from './GymNavbar'
import { getFullThemeCSSVars, getFontStack } from '../../lib/gymTheme'
import { SocialIcon } from '../../lib/socialPlatforms.jsx'

export default function GymLayout() {
  return (
    <GymProvider>
      <GymLayoutInner />
    </GymProvider>
  )
}

function GymLayoutInner() {
  const { gym, loading, error } = useGym()

  const fontStack = gym ? getFontStack(gym.font_family) : null

  // Inject font override into <head> — body <style> tags have rendering-order
  // issues on mobile (processed after Tailwind's stylesheet).
  useEffect(() => {
    const STYLE_ID = 'gym-font-override'
    let el = document.getElementById(STYLE_ID)
    if (!fontStack || !gym?.font_family || gym.font_family === 'default') {
      el?.remove()
      return
    }
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    el.textContent = `.font-display { font-family: ${fontStack} !important; }`
    return () => { document.getElementById(STYLE_ID)?.remove() }
  }, [fontStack, gym?.font_family])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm tracking-widest uppercase font-sans">Loading</p>
        </div>
      </div>
    )
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-3xl font-display text-white mb-3">GYM NOT FOUND</h1>
          <p className="text-white/40 text-sm mb-8">This gym doesn't exist or has been removed.</p>
          <a href="/" className="inline-flex items-center justify-center px-8 py-3 bg-white text-black font-semibold rounded-lg text-sm hover:bg-white/90 transition-colors">
            Go to Homepage
          </a>
        </div>
      </div>
    )
  }

  const themeVars = getFullThemeCSSVars(gym)
  const base = `/${gym.slug}`

  return (
    <div
      data-gym-theme={gym.theme_mode || 'dark'}
      style={{ ...themeVars, background: 'var(--gym-bg)', color: 'var(--gym-text)', overflowX: 'hidden' }}
      className="min-h-screen"
    >
      <GymNavbar />
      <main>
        <Outlet />
      </main>

      {/* Theme-aware footer */}
      <footer style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-10 mb-12">

            {/* Brand + social */}
            <div className="sm:col-span-2 md:col-span-5">
              <div className="flex items-center gap-3 mb-5">
                {gym.logo_url ? (
                  <img src={gym.logo_url} alt={gym.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: 'var(--gym-gradient)' }}>
                    {gym.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-display text-xl tracking-wider" style={{ color: 'var(--gym-text)' }}>
                  {gym.name.toUpperCase()}
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--gym-text-muted)' }}>
                {gym.description || `Premium fitness facility${gym.city ? ` in ${gym.city}` : ''}. Built for those who refuse to settle.`}
              </p>
              {/* Social icons */}
              {(gym.social_links?.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {gym.social_links.map(link => (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.platform}
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-110"
                      style={{ background: 'var(--gym-border)', color: 'var(--gym-text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--gym-primary)'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--gym-border)'; e.currentTarget.style.color = 'var(--gym-text-secondary)' }}
                    >
                      <SocialIcon platform={link.platform} className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Navigate */}
            <div className="md:col-span-3 md:col-start-7">
              <h4 className="text-xs tracking-[0.2em] uppercase mb-5 font-sans font-bold" style={{ color: 'var(--gym-text-muted)' }}>Navigate</h4>
              <ul className="space-y-3">
                {[
                  { to: base, label: 'Home' },
                  { to: `${base}/about`, label: 'About' },
                  { to: `${base}/pricing`, label: 'Pricing' },
                  { to: `${base}/trainers`, label: 'Trainers' },
                  { to: `${base}/contact`, label: 'Contact' },
                ].map(link => (
                  <li key={link.to}>
                    <a
                      href={link.to}
                      className="text-sm transition-colors duration-200"
                      style={{ color: 'var(--gym-text-secondary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--gym-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--gym-text-secondary)'}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="md:col-span-3">
              <h4 className="text-xs tracking-[0.2em] uppercase mb-5 font-sans font-bold" style={{ color: 'var(--gym-text-muted)' }}>Contact</h4>
              <div className="space-y-3">
                {gym.phone && (
                  <a href={`tel:${gym.phone}`} className="flex items-start gap-2 text-sm transition-colors" style={{ color: 'var(--gym-text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--gym-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--gym-text-secondary)'}>
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {gym.phone}
                  </a>
                )}
                {gym.email && (
                  <a href={`mailto:${gym.email}`} className="flex items-start gap-2 text-sm transition-colors" style={{ color: 'var(--gym-text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--gym-text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--gym-text-secondary)'}>
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    {gym.email}
                  </a>
                )}
                {(gym.address || gym.city) && (
                  <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--gym-text-secondary)' }}>
                    <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--gym-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="whitespace-pre-line">{gym.address || gym.city}</span>
                  </div>
                )}
                {!gym.phone && !gym.email && !gym.address && !gym.city && (
                  <p className="text-sm italic" style={{ color: 'var(--gym-text-muted)' }}>No contact details set</p>
                )}
              </div>
              <div className="mt-8 h-px w-16" style={{ background: 'var(--gym-gradient)' }} />
            </div>

          </div>

          {/* Bottom bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--gym-border)' }}>
            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
              &copy; {new Date().getFullYear()} {gym.name}. All rights reserved.
            </p>
            <p className="text-xs" style={{ color: 'var(--gym-text-muted)' }}>
              Powered by <span className="font-medium" style={{ color: 'var(--gym-text-secondary)' }}>Gymmobius</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
