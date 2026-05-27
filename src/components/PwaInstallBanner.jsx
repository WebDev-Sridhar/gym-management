/**
 * PwaInstallBanner — shows a bottom-fixed install prompt whenever Chrome
 * fires the beforeinstallprompt event.
 *
 * Why this is better than the Chrome mini-infobar:
 *   Chrome's automatic mini-infobar has a ~3-month cooldown per origin after
 *   the first prompt/dismissal. This component captures the event ourselves
 *   (preventing Chrome from ever showing the infobar) and shows it on our
 *   own schedule — immediately on first visit, then again after 7 days.
 *
 * Works on both the main Gymmobius domain and all tenant subdomains.
 */

import { useState, useEffect } from 'react'
import { usePwaInstall } from '../hooks/usePwaInstall'

const DISMISS_KEY         = 'gymmobius-pwa-dismissed-at'
const SESSION_DISMISS_KEY = 'gymmobius-pwa-session-dismissed'
const SNOOZE_MS           = 7 * 24 * 60 * 60 * 1000   // 7 days (manual X)
const AUTO_CLOSE_MS       = 12_000                    // 12s — long enough to read, short enough not to nag

export default function PwaInstallBanner({ logo, appName }) {
  const { canInstall, isInstalled, install } = usePwaInstall()
  const [hidden, setHidden]   = useState(true)   // start hidden to avoid flash
  const [closing, setClosing] = useState(false)

  const iconSrc  = logo    || '/favicon/web-app-manifest-192x192.png'
  const name     = appName || 'Gymmobius'

  // Reveal the banner only after checking BOTH snooze stores:
  //   - localStorage: 7-day snooze written by manual X dismiss
  //   - sessionStorage: per-session snooze written by auto-close (so the
  //     banner doesn't pop again on every nav within the same session, but
  //     comes back fresh next time the user opens the site)
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (Date.now() - ts > SNOOZE_MS) {
      setHidden(false)
    }
  }, [])

  function handleInstall() {
    install()
    setClosing(true)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now())
    setClosing(true)
  }

  // Auto-close after AUTO_CLOSE_MS once the banner is actually showing. We
  // gate on every visibility condition (not just hidden) so the timer doesn't
  // start during the initial brief period before usePwaInstall captures
  // beforeinstallprompt. If the user installs or dismisses, the closing
  // state cleanup tears this effect down before the timer fires.
  //
  // Auto-close is treated lighter than manual X — it writes sessionStorage,
  // not localStorage, so the banner returns on a fresh session.
  useEffect(() => {
    if (hidden || closing || !canInstall || isInstalled) return
    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1')
      setClosing(true)
    }, AUTO_CLOSE_MS)
    return () => clearTimeout(t)
  }, [hidden, closing, canInstall, isInstalled])

  // After slide-out animation completes, fully remove from DOM
  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => setHidden(true), 300)
    return () => clearTimeout(t)
  }, [closing])

  if (!canInstall || isInstalled || hidden) return null

  return (
    <div
      role="banner"
      aria-label="Install app"
      style={{
        transform: closing ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-3 px-4 py-3
                 bg-[var(--color-surface,#18181b)] border-t border-[var(--color-border,#27272a)]
                 shadow-2xl safe-area-pb"
    >
      {/* App icon */}
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className="h-10 w-10 rounded-xl flex-shrink-0 object-cover"
      />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-text,#fafafa)] truncate leading-tight">
          {name}
        </p>
        <p className="text-xs text-[var(--color-text-muted,#a1a1aa)] leading-tight mt-0.5">
          Install for faster access — works offline
        </p>
      </div>

      {/* Install button */}
      <button
        onClick={handleInstall}
        className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold
                   bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                   text-white transition-colors"
      >
        Install
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 p-1.5 rounded-full
                   text-[var(--color-text-muted,#a1a1aa)] hover:text-[var(--color-text,#fafafa)]
                   hover:bg-[var(--color-surface-hover,#27272a)] transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
        </svg>
      </button>
    </div>
  )
}
