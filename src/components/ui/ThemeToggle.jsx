import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../store/ThemeContext'

/**
 * Compact light/dark switch.
 *
 * Variants:
 *  - `switch` (default) — pill with sun/moon icons, thumb slides between them
 *  - `icon`              — single-icon round button (used in dense menus)
 */
export default function ThemeToggle({ variant = 'switch', className = '' }) {
  const { isDark, toggle } = useTheme()

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer ${className}`}
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={`relative inline-flex items-center w-14 h-7 rounded-full border transition-colors cursor-pointer shrink-0 ${
        isDark
          ? 'bg-indigo-600 border-indigo-500'
          : 'bg-gray-200 border-gray-300'
      } ${className}`}
    >
      {/* Sun icon (visible in light mode) */}
      <Sun
        size={11}
        className={`absolute left-1.5 transition-opacity ${isDark ? 'opacity-40 text-white' : 'opacity-100 text-amber-500'}`}
      />
      {/* Moon icon (visible in dark mode) */}
      <Moon
        size={11}
        className={`absolute right-1.5 transition-opacity ${isDark ? 'opacity-100 text-white' : 'opacity-40 text-gray-500'}`}
      />
      {/* Thumb */}
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: isDark ? 'translateX(30px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
