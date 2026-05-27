import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vite dev-only plugin: serves /api/manifest so Chrome's PWA install
 * flow works on localhost.
 *
 * In production Vercel serves this path via api/manifest.js (serverless
 * function). Vite doesn't know about Vercel API routes, so without this
 * plugin /api/manifest returns 404 in dev and Chrome won't show the
 * install button.
 *
 * On localhost there's no real tenant subdomain, so we always return the
 * generic Gymmobius manifest — identical to what production returns for
 * the main domain.
 */
function devManifestPlugin(): Plugin {
  const manifest = {
    name: 'Gymmobius',
    short_name: 'Gymmobius',
    description: 'Run your gym like a business — members, payments, reminders, website.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    orientation: 'portrait-primary',
    icons: [
      { src: '/favicon/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/favicon/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],

  }

  return {
    name: 'dev-manifest',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/manifest') return next()
        res.setHeader('Content-Type', 'application/manifest+json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(manifest))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devManifestPlugin()],
})
