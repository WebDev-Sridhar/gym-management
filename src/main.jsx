import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/error/AppErrorBoundary'
import { initSentry } from './lib/sentry'

// V3 launch fix: initialize Sentry before anything renders so first-paint
// errors are captured too. No-op when VITE_SENTRY_DSN is unset (local dev).
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

// Register service worker — required for PWA installability.
// Runs after first paint so it doesn't block hydration. Skips dev / file://
// to avoid noisy console errors during local development.
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('[sw] registration failed:', err.message))
  })
}
