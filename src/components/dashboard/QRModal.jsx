import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Copy, Check, Download } from 'lucide-react'
import { fetchGymDetails } from '../../services/membershipService'

/**
 * QRModal — shows the gym's member check-in QR as a popup on the dashboard, so
 * "Show QR" doesn't have to navigate to the Attendance page. The poster itself
 * is an always-dark navy card (it's designed to be printed); the modal chrome
 * is theme-aware.
 *
 * Rendered INLINE (not via createPortal) on purpose: the dark theme remaps
 * (bg-white → surface, text-gray-*, borders, bg-indigo-* hovers) are scoped to
 * `.app-owner`, and a portal to document.body would escape that scope and stay
 * light. The dashboard has no transformed ancestor, so `position: fixed` still
 * overlays the viewport correctly from here.
 */
export default function QRModal({ gymId, onClose }) {
  const [gym, setGym] = useState(null)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef(null)

  useEffect(() => {
    if (!gymId) return
    fetchGymDetails(gymId).then(setGym).catch(() => setGym(null))
  }, [gymId])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const checkinUrl = `${window.location.origin}/checkin?gymId=${gymId}`
  const gymName = gym?.name || 'Gym Check-in'
  const gymLogo = gym?.logo_url || ''

  function copyLink() {
    navigator.clipboard?.writeText(checkinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // High-res printable banner (600×820 PNG) — same composition as the
  // Attendance page so the asset is identical wherever it's downloaded.
  function downloadBanner() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const W = 600, H = 820, QR = 280
    const xml = new XMLSerializer().serializeToString(svg)
    const qrImg = new Image()
    qrImg.onload = () => {
      const render = (logoImg) => {
        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')
        const bg = ctx.createLinearGradient(0, 0, 0, H)
        bg.addColorStop(0, '#0e0f2a'); bg.addColorStop(1, '#1a1040')
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
        const bar = ctx.createLinearGradient(0, 0, W, 0)
        bar.addColorStop(0, '#6366f1'); bar.addColorStop(1, '#8b5cf6')
        ctx.fillStyle = bar; ctx.fillRect(0, 0, W, 6)
        let headerBottom = 60
        if (logoImg) {
          const LOGO = 64, cx0 = W / 2, cy0 = 54
          ctx.fillStyle = '#ffffff'
          ctx.beginPath(); ctx.arc(cx0, cy0, LOGO / 2 + 5, 0, Math.PI * 2); ctx.fill()
          ctx.save(); ctx.beginPath(); ctx.arc(cx0, cy0, LOGO / 2, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(logoImg, cx0 - LOGO / 2, cy0 - LOGO / 2, LOGO, LOGO); ctx.restore()
          headerBottom = 108
        }
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(gymName, W / 2, headerBottom + 36)
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '18px system-ui, -apple-system, sans-serif'
        ctx.fillText('Scan to mark your attendance', W / 2, headerBottom + 72)
        const cy = headerBottom + 112, cx = (W - QR) / 2
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(cx - 24, cy - 24, QR + 48, QR + 48, 20); ctx.fill()
        ctx.drawImage(qrImg, cx, cy, QR, QR)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(60, cy + QR + 60); ctx.lineTo(W - 60, cy + QR + 60); ctx.stroke()
        let sy = cy + QR + 100
        ;[['1', 'Open your phone camera'], ['2', 'Point at the QR code'], ['3', 'Tap the link to check in']].forEach(([n, text]) => {
          const circleX = W / 2 - 130
          ctx.fillStyle = 'rgba(99,102,241,0.3)'; ctx.beginPath(); ctx.arc(circleX, sy - 7, 18, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(n, circleX, sy)
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '20px system-ui, -apple-system, sans-serif'
          ctx.textAlign = 'left'; ctx.fillText(text, circleX + 28, sy); sy += 52
        })
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '13px system-ui, -apple-system, sans-serif'; ctx.textAlign = 'center'
        ctx.fillText('Powered by Gymmobius', W / 2, H - 28)
        const a = document.createElement('a')
        a.download = `${gymName.toLowerCase().replace(/\s+/g, '-')}-checkin-qr.png`
        a.href = canvas.toDataURL('image/png'); a.click()
      }
      if (gymLogo) {
        const logo = new Image(); logo.crossOrigin = 'anonymous'
        logo.onload = () => render(logo); logo.onerror = () => render(null); logo.src = gymLogo
      } else { render(null) }
    }
    qrImg.src = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(xml).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Member Check-in QR</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Navy poster preview (intentionally always-dark; designed for print) */}
          <div className="mx-auto" style={{ width: 240, background: 'linear-gradient(160deg,#0e0f2a,#1a1040)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
            <div style={{ padding: '18px 18px 20px', textAlign: 'center' }}>
              {gymLogo && (
                <div style={{ marginBottom: 10 }}>
                  <img src={gymLogo} alt="logo" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
                </div>
              )}
              <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 3, letterSpacing: '-0.2px' }}>{gymName}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 14 }}>Scan to mark your attendance</p>
              <div ref={qrRef} style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 8 }}>
                <QRCodeSVG value={checkinUrl} size={120} level="M" marginSize={0} />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8, marginTop: 14 }}>Powered by Gymmobius</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Display at your entrance — members scan with any phone camera, no app needed.
          </p>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={copyLink}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={downloadBanner}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Download size={14} /> Download banner
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
