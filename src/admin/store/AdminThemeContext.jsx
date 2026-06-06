import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'admin:theme'
const AdminThemeContext = createContext(null)

function readInitial() {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* ignore */ }
  return 'dark'
}

// Set the attribute synchronously at module load (before first paint) so a
// chosen light theme doesn't flash dark on reload.
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-admin-theme', readInitial())
}

export function AdminThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
  }, [theme])

  // Clean up the attribute when leaving the admin app (back to tenant routes).
  useEffect(() => () => {
    document.documentElement.removeAttribute('data-admin-theme')
  }, [])

  const value = {
    theme,
    isLight: theme === 'light',
    setTheme: setThemeState,
    toggle: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
  }
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext)
  if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider')
  return ctx
}
