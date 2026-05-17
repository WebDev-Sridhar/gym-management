import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * Owner-dashboard dark mode.
 *
 * - Stored in localStorage under `gymmobius-theme` (values: 'light' | 'dark').
 * - First-load fallback honours `prefers-color-scheme`.
 * - Sets `data-theme` attribute on <html> so CSS overrides in index.css fire.
 * - To prevent FOUC, a tiny inline script in index.html applies the attribute
 *   *before* React mounts.
 *
 * Scope: only the owner dashboard cares — the CSS overrides in index.css are
 * scoped to `.app-owner` so landing pages, login, gym public site, and the
 * trainer/member apps are unaffected.
 */

const STORAGE_KEY = 'gymmobius-theme'
const ThemeContext = createContext(null)

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  // Honour what the inline script in index.html already applied
  const attr = document.documentElement.getAttribute('data-theme')
  if (attr === 'light' || attr === 'dark') return attr
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const setTheme = useCallback((t) => {
    if (t === 'light' || t === 'dark') setThemeState(t)
  }, [])

  const toggle = useCallback(() => {
    setThemeState(t => t === 'dark' ? 'light' : 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
