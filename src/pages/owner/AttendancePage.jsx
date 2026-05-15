import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../store/AuthContext'
import { fetchAttendance, fetchAttendanceSummary, manualCheckin, fetchMembers, fetchGymDetails } from '../../services/membershipService'
import { useDialog } from '../../components/ui/Dialog'
import CustomSelect from '../../components/ui/CustomSelect'
import Pagination from '../../components/ui/Pagination'

// Supabase can return timestamptz without a 'Z' suffix. Without it, JS Date
// parses the string as local time instead of UTC, showing times hours off.
function parseTS(ts) {
  if (!ts) return new Date(NaN)
  return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts + 'Z')
}

export default function AttendancePage() {
  const dialog = useDialog()
  const { gymId } = useAuth()
  const [checkins, setCheckins] = useState([])
  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCheckin, setShowCheckin] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [gymName, setGymName] = useState('')
  const [gymLogo, setGymLogo] = useState('')
  const [bannerOpen, setBannerOpen] = useState(true)
  const qrRef = useRef(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

    fetchGymDetails(gymId).then(g => { if (!cancelled && g) { setGymName(g.name || ''); setGymLogo(g.logo_url || '') } }).catch(() => {})

    Promise.all([
      fetchAttendance(gymId, selectedDate),
      fetchAttendanceSummary(gymId, 7),
      fetchMembers(gymId),
    ])
      .then(([att, sum, mem]) => {
        if (cancelled) return
        setCheckins(att)
        setSummary(sum)
        setMembers(mem)
      })
      .catch((err) => console.error('Failed to load attendance:', err))
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [gymId, selectedDate])

  async function handleManualCheckin(e) {
    e.preventDefault()
    if (!selectedMemberId) return

    setSubmitting(true)
    try {
      const newCheckin = await manualCheckin({ gymId, memberId: selectedMemberId })
      setCheckins((prev) => [newCheckin, ...prev])
      setSelectedMemberId('')
      setShowCheckin(false)
    } catch (err) {
      dialog.alert(err.message || 'Failed to mark check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const isToday = selectedDate === today

  // Members who haven't checked in today (for manual checkin dropdown)
  const checkedInIds = new Set(checkins.map((c) => c.member?.id).filter(Boolean))
  const availableMembers = members.filter((m) => !checkedInIds.has(m.id) && m.status === 'active')

  // Search filter
  const filteredCheckins = checkins.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.member?.name || '').toLowerCase().includes(q) || (c.member?.phone || '').includes(q)
  })
  const totalPages = Math.max(1, Math.ceil(filteredCheckins.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedCheckins = filteredCheckins.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Last 7 days for the bar chart
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    last7Days.push({ date: key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), count: summary[key] || 0 })
  }
  const maxCount = Math.max(...last7Days.map((d) => d.count), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const checkinUrl = `${window.location.origin}/checkin?gymId=${gymId}`

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const W = 600, H = 820
    const QR = 280

    const xml = new XMLSerializer().serializeToString(svg)
    const qrImg = new Image()

    qrImg.onload = () => {
      function render(logoImg) {
        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, H)
        bg.addColorStop(0, '#0e0f2a'); bg.addColorStop(1, '#1a1040')
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

        // Top accent bar
        const bar = ctx.createLinearGradient(0, 0, W, 0)
        bar.addColorStop(0, '#6366f1'); bar.addColorStop(1, '#8b5cf6')
        ctx.fillStyle = bar; ctx.fillRect(0, 0, W, 6)

        // Logo circle
        let headerBottom = 60
        if (logoImg) {
          const LOGO = 64, cx0 = W / 2, cy0 = 54
          ctx.fillStyle = '#ffffff'
          ctx.beginPath(); ctx.arc(cx0, cy0, LOGO / 2 + 5, 0, Math.PI * 2); ctx.fill()
          ctx.save()
          ctx.beginPath(); ctx.arc(cx0, cy0, LOGO / 2, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(logoImg, cx0 - LOGO / 2, cy0 - LOGO / 2, LOGO, LOGO)
          ctx.restore()
          headerBottom = 108
        }

        // Gym name
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 38px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(gymName || 'Gym Check-in', W / 2, headerBottom + 36)

        // Tagline
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.font = '18px system-ui, -apple-system, sans-serif'
        ctx.fillText('Scan to mark your attendance', W / 2, headerBottom + 72)

        // QR white card
        const cy = headerBottom + 112, cx = (W - QR) / 2
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.roundRect(cx - 24, cy - 24, QR + 48, QR + 48, 20); ctx.fill()
        ctx.drawImage(qrImg, cx, cy, QR, QR)

        // Divider
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(60, cy + QR + 60); ctx.lineTo(W - 60, cy + QR + 60); ctx.stroke()

        // Steps
        let sy = cy + QR + 100
        ;[['1','Open your phone camera'],['2','Point at the QR code'],['3','Tap the link to check in']].forEach(([n, text]) => {
          const circleX = W / 2 - 130
          ctx.fillStyle = 'rgba(99,102,241,0.3)'
          ctx.beginPath(); ctx.arc(circleX, sy - 7, 18, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#818cf8'; ctx.font = 'bold 16px system-ui'
          ctx.textAlign = 'center'; ctx.fillText(n, circleX, sy)
          ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '20px system-ui, -apple-system, sans-serif'
          ctx.textAlign = 'left'; ctx.fillText(text, circleX + 28, sy)
          sy += 52
        })

        // Footer
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '13px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'; ctx.fillText('Powered by Gymmobius', W / 2, H - 28)

        const a = document.createElement('a')
        a.download = `${(gymName || 'gym').toLowerCase().replace(/\s+/g, '-')}-checkin-qr.png`
        a.href = canvas.toDataURL('image/png'); a.click()
      }

      if (gymLogo) {
        const logo = new Image()
        logo.crossOrigin = 'anonymous'
        logo.onload  = () => render(logo)
        logo.onerror = () => render(null)   // fallback: skip logo if CORS fails
        logo.src = gymLogo
      } else {
        render(null)
      }
    }

    qrImg.src = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(xml).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            {checkins.length} check-in{checkins.length !== 1 ? 's' : ''} {isToday ? 'today' : `on ${new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
          {isToday && (
            <button
              onClick={() => setShowCheckin(!showCheckin)}
              className="px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer"
            >
              {showCheckin ? 'Cancel' : '+ Mark Check-in'}
            </button>
          )}
        </div>
      </div>

      {/* QR Code banner card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setBannerOpen(o => !o)}
          className="w-full px-6 pt-5 pb-4 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-900">Member Check-in QR Code</h2>
            <p className="text-xs text-gray-500 mt-0.5">Display at your gym entrance — members scan to check in instantly, no app needed.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 ml-4 transition-transform duration-200 ${bannerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {bannerOpen && (
        <div className="border-t border-gray-100">
          {/* Action buttons */}
          <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 bg-gray-50/50">
            <button
              onClick={() => navigator.clipboard.writeText(checkinUrl)}
              className="px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer"
            >
              Copy Link
            </button>
            <button
              onClick={downloadQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Banner
            </button>
          </div>

          {/* Banner preview + instructions side by side */}
          <div className="flex flex-col md:flex-row gap-0">

          {/* Left — banner preview */}
          <div className="flex items-center justify-center p-8 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 md:w-72 shrink-0">
            <div style={{ width: 240, background: 'linear-gradient(160deg,#0e0f2a,#1a1040)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
              <div style={{ padding: '18px 18px 20px', textAlign: 'center' }}>
                {/* Logo */}
                {gymLogo && (
                  <div style={{ marginBottom: 10 }}>
                    <img src={gymLogo} alt="logo"
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
                  </div>
                )}
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 3, letterSpacing: '-0.2px' }}>
                  {gymName || 'Gym Check-in'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginBottom: 14 }}>
                  Scan to mark your attendance
                </p>
                <div ref={qrRef} style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 8 }}>
                  <QRCodeSVG value={checkinUrl} size={110} level="M" marginSize={0} />
                </div>
                <div style={{ marginTop: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[['1','Open phone camera'],['2','Point at QR code'],['3','Tap link to check in']].map(([n, t]) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 17, height: 17, borderRadius: '50%', background: 'rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#818cf8', fontSize: 9, fontWeight: 800 }}>{n}</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>{t}</span>
                    </div>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8, marginTop: 14 }}>Powered by Gymmobius</p>
              </div>
            </div>
          </div>

          {/* Right — instructions */}
          <div className="flex-1 p-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">How to set up member check-in</h3>
            <p className="text-xs text-gray-500 mb-6">Follow these steps to get your gym entrance ready for QR-based attendance.</p>

            <ol className="space-y-5">
              {[
                {
                  title: 'Download the banner',
                  desc: 'Click "Download Banner" above to save a high-resolution 600×820 PNG. The banner includes your gym name, QR code, and instructions for members.',
                },
                {
                  title: 'Print and display',
                  desc: 'Print on A4 or A5 paper and place it at your reception desk, entrance gate, or gym floor. Laminating it keeps it durable. You can also display it on a tablet or TV screen.',
                },
                {
                  title: 'Members scan with any camera',
                  desc: 'No app download needed. Members open their phone camera, point at the QR code, and tap the link. If they\'re already signed in, check-in happens in one tap.',
                },
                {
                  title: 'First-time members sign in once',
                  desc: 'New members will be prompted to sign in the first time. After that, the session is remembered — every future scan is a single tap.',
                },
                {
                  title: 'Attendance is recorded instantly',
                  desc: 'Each check-in appears on this page in real time. A 1-hour cooldown prevents accidental double check-ins. You can also mark check-ins manually using the "+ Mark Check-in" button.',
                },
              ].map(({ title, desc }, i) => (
                <li key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 p-3 bg-violet-50 border border-violet-100 rounded-lg">
              <p className="text-xs text-violet-700 font-medium">
                You can also share the check-in link directly via WhatsApp — members bookmark it and tap to check in anytime.
              </p>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>

      {/* Manual check-in form */}
      {showCheckin && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Manual Check-in</h2>
          <form onSubmit={handleManualCheckin} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Member</label>
              <CustomSelect
                value={selectedMemberId}
                onChange={setSelectedMemberId}
                placeholder="Choose a member..."
                options={availableMembers.map((m) => ({
                  value: m.id,
                  label: m.name,
                  hint: m.phone || undefined,
                }))}
              />
            </div>
            <button
              type="submit"
              disabled={!selectedMemberId || submitting}
              className="px-6 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Marking...' : 'Check In'}
            </button>
          </form>
          {availableMembers.length === 0 && (
            <p className="text-xs text-gray-400 mt-3">All active members have already checked in today.</p>
          )}
        </div>
      )}

      {/* 7-day attendance chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Last 7 Days</h2>
        <div className="flex items-end justify-between gap-2 h-32">
          {last7Days.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">{day.count}</span>
              <div
                className={`w-full rounded-t-md transition-all ${day.date === selectedDate ? 'bg-violet-500' : 'bg-violet-200'}`}
                style={{ height: `${Math.max((day.count / maxCount) * 100, 4)}%` }}
              />
              <span className={`text-xs ${day.date === selectedDate ? 'text-violet-600 font-semibold' : 'text-gray-400'}`}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      {checkins.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search check-ins..."
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 w-full sm:w-64"
        />
      )}

      {/* Check-in list */}
      {filteredCheckins.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No check-ins</h3>
          <p className="text-sm text-gray-500">
            {isToday ? 'No members have checked in today yet.' : 'No check-ins recorded on this date.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedCheckins.map((checkin) => (
                  <tr key={checkin.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm shrink-0">
                          {checkin.member?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{checkin.member?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{checkin.member?.phone || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">
                        {parseTS(checkin.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} totalPages={totalPages} total={filteredCheckins.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
