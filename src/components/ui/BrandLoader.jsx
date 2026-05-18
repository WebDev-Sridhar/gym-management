/**
 * BrandLoader — premium logo-based loading state.
 *
 * Layout: static logo (no spin) + soft pulsing halo + slim indeterminate
 * progress bar + optional title/subtitle. Feels like Linear / Vercel.
 *
 * Props:
 *   title    — large text below the logo (e.g. "Signing you in")
 *   subtitle — smaller helper line
 *   size     — logo px size (default 56)
 *   fullScreen — wraps the loader in a fixed full-viewport container
 *   className  — extra classes on the inner block
 */
export default function BrandLoader({
  title,
  subtitle,
  size = 56,
  fullScreen = false,
  className = '',
}) {
  const inner = (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Logo + halo */}
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Pulsing halo */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full brand-loader-halo"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.35), rgba(99,102,241,0) 70%)',
          }}
        />
        {/* Logo — static, no spin */}
        <img
          src="/logo.png"
          alt=""
          className="relative brand-loader-logo"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      </div>

      {/* Indeterminate progress bar */}
      <div className="mt-6 w-44 max-w-full h-[3px] rounded-full bg-gray-200/70 overflow-hidden relative">
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-600 to-violet-500 brand-loader-bar" />
      </div>

      {title && (
        <h2 className="mt-5 text-base font-semibold text-gray-900">{title}</h2>
      )}
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500 max-w-xs">{subtitle}</p>
      )}
    </div>
  )

  if (!fullScreen) return inner

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      {inner}
    </div>
  )
}
