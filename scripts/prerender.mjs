/**
 * prerender.mjs — snapshot the marketing routes to static HTML (headless
 * Chromium), so crawlers and social/AI bots get real per-page <head> + <body>
 * instead of an empty SPA shell.
 *
 * Pipeline (runs after `vite build` AND after gen-seo-files.mjs):
 *   1. Read the pristine shell from dist/__shell.html (written by
 *      gen-seo-files.mjs) into memory.
 *   2. Serve dist/ over localhost: real files from disk, everything else falls
 *      back to the in-memory shell (mirrors the Vercel SPA rewrite).
 *   3. For each marketing route: navigate, let React render, capture the DOM.
 *   4. Write dist/<route>/index.html (home → dist/index.html).
 *
 * DESIGN: this step is BEST-EFFORT and NON-FATAL. If Chromium can't launch
 * (e.g. a CI runner without the right libs), we log a warning and exit 0. The
 * site still works — pages fall back to client-rendered SEO, __shell.html and
 * the sitemap already exist, and tenant OG injection is unaffected.
 *
 * Tenant rendering is NEVER touched: we only prerender main-domain marketing
 * routes (localhost classifies as 'main' host), writing files the tenant
 * middleware path doesn't read.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join, extname } from 'node:path'
import { MARKETING_ROUTES } from './marketing-routes.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')
const PORT = 4178

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
}

async function main() {
  const shellPath = resolve(DIST, '__shell.html')
  if (!existsSync(shellPath)) {
    console.warn('[prerender] dist/__shell.html missing — skipping prerender (build still OK)')
    return
  }
  const shellHtml = readFileSync(shellPath, 'utf8')

  // ── Dynamic import so a missing/broken puppeteer never hard-fails the build ──
  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch (err) {
    console.warn(`[prerender] puppeteer unavailable (${err.message}) — skipping prerender`)
    return
  }

  // ── Static server with SPA fallback to the in-memory shell ──────────────────
  const server = createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      const filePath = join(DIST, urlPath)
      if (
        urlPath !== '/' &&
        filePath.startsWith(DIST) &&
        existsSync(filePath) &&
        statSync(filePath).isFile()
      ) {
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' })
        res.end(readFileSync(filePath))
        return
      }
    } catch { /* fall through to shell */ }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(shellHtml)
  })
  await new Promise((r) => server.listen(PORT, r))

  let browser
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    let ok = 0
    for (const { path } of MARKETING_ROUTES) {
      const page = await browser.newPage()
      try {
        await page.goto(`http://localhost:${PORT}${path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        })
        // Wait until React has actually mounted content into #root.
        await page.waitForFunction(
          () => {
            const root = document.getElementById('root')
            return root && root.children.length > 0 && document.title
          },
          { timeout: 15000 },
        )
        const html = await page.content()

        // Write directory-style so Vercel serves it for the clean URL.
        const outDir = path === '/' ? DIST : join(DIST, path)
        mkdirSync(outDir, { recursive: true })
        writeFileSync(join(outDir, 'index.html'), html, 'utf8')
        ok++
        console.log(`[prerender] ${path} -> ${path === '/' ? 'index.html' : `${path}/index.html`}`)
      } catch (err) {
        console.warn(`[prerender] ${path} failed: ${err.message} (will fall back to CSR)`)
      } finally {
        await page.close()
      }
    }
    console.log(`[prerender] done — ${ok}/${MARKETING_ROUTES.length} routes prerendered`)
  } finally {
    if (browser) await browser.close()
    server.close()
  }
}

main().catch((err) => {
  // Never fail the build because of prerender.
  console.warn(`[prerender] skipped due to error: ${err.message}`)
})
