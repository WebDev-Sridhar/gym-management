import { Component } from 'react'
import { captureError } from '../../lib/sentry'

// Top-level error boundary. Wraps the entire <App/> so any uncaught render
// error (broken page, missing context, etc.) lands here instead of a blank
// white screen. Reports to Sentry when DSN is configured; otherwise just
// logs to console.
//
// Designed to be the OUTER boundary. Page-specific boundaries (e.g.
// MarketingErrorBoundary on the landing pages) can sit inside this — when
// the inner one catches, the outer one is bypassed. The fallback here is
// intentionally bare-bones (no router, no theme, no AuthContext) because
// any of those could be the thing that crashed.

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack })
    // Always log to console too — Sentry might be off in dev.
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Inline styles (no Tailwind) — a CSS load failure would still crash
    // this fallback if we relied on the stylesheet.
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f9fafb',
      }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: '#fef2f2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28, fontWeight: 700,
          }}>!</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Gymmobius hit an unexpected error. We've logged it and will look into it.
            Please reload and try again.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 20px', background: '#4f46e5', color: '#fff',
              border: 0, borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    )
  }
}
