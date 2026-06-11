import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * Owner-dashboard theming.
 *
 * Two values to keep distinct:
 *   • `preference` — what the user picked: 'light' | 'dark' | 'system'.
 *     This is what gets persisted in localStorage + drives the Settings
 *     picker's active highlight.
 *   • `theme`      — the resolved value applied to <html data-theme>:
 *     always 'light' or 'dark'. When preference='system' we resolve it
 *     against `prefers-color-scheme` and listen for OS-level changes.
 *
 * Most consumers should only care about `theme` / `isDark`. The Settings
 * Appearance picker uses `preference` so 'System' stays highlighted even
 * after the OS resolves it to 'dark' or 'light'.
 *
 * Scope: only the owner dashboard cares — the CSS overrides in index.css are
 * scoped to `.app-owner` so landing pages, login, gym public site, and the
 * trainer/member apps are unaffected.
 *
 * To prevent FOUC, the inline script in index.html applies the resolved
 * theme to <html> BEFORE React mounts. Sync changes here with that script.
 */

const STORAGE_KEY = 'gymmobius-theme'
const ThemeContext = createContext(null)

function getInitialPreference() {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* ignore */ }
  // Default for first-time visitors: follow the OS. Previously this code
  // returned a resolved light/dark which silently locked users out of the
  // OS-follow behavior they'd otherwise expect.
  return 'system'
}

function resolvePreference(pref) {
  if (pref === 'light' || pref === 'dark') return pref
  // pref === 'system' (or anything weird) — derive from OS
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getInitialPreference)
  const [theme, setResolvedTheme]   = useState(() => resolvePreference(getInitialPreference()))

  // Persist preference + recompute resolved theme whenever it changes.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* ignore */ }
    setResolvedTheme(resolvePreference(preference))
  }, [preference])

  // Apply resolved theme to <html> so CSS overrides in index.css fire.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // When preference is 'system', track OS-level theme changes so the
  // dashboard flips with the user's OS toggle. Listener tears down when
  // user picks an explicit light/dark, so no unnecessary work in that case.
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e) => setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const setTheme = useCallback((t) => {
    if (t === 'light' || t === 'dark' || t === 'system') setPreference(t)
  }, [])

  // Toggle = flip the EFFECTIVE theme. From 'system' resolved as dark,
  // toggling switches to explicit 'light' (and vice versa), so the user
  // gets the result they expect without leaving system-follow accidentally.
  const toggle = useCallback(() => {
    setPreference((p) => {
      const effective = p === 'system' ? resolvePreference('system') : p
      return effective === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme,
      preference,
      isDark: theme === 'dark',
      setTheme,
      toggle,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
