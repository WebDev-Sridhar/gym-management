import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import { fetchAttendance, fetchAttendanceSummary, manualCheckin, fetchMembers, fetchGymDetails } from '../../services/membershipService'
import { useDialog } from '../../components/ui/Dialog'
import Pagination from '../../components/ui/Pagination'
import { Search, X, Check } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { Sk } from '../../components/ui/Skeleton'

function AttendanceSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2"><Sk h={28} w={150} /><Sk h={14} w={180} /></div>
        <div className="flex gap-3"><Sk h={38} w={110} r={10} /><Sk h={38} w={140} r={10} /></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Sk h={18} w={200} /><Sk h={14} w="85%" /><Sk h={14} w="70%" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between"><Sk h={18} w={110} /><Sk h={12} w={120} /></div>
        <Sk h={140} r={8} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <Sk h={36} w={36} r={99} />
            <div className="flex-1 space-y-1.5"><Sk h={14} w="40%" /><Sk h={11} w="25%" /></div>
            <Sk h={12} w={80} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Supabase can return timestamptz without a 'Z' suffix. Without it, JS Date
// parses the string as local time instead of UTC, showing times hours off.
function parseTS(ts) {
  if (!ts) return new Date(NaN)
  return new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : ts + 'Z')
}

export default function AttendancePage() {
  const dialog = useDialog()
  const { gymId } = useAuth()
  const { selectedBranchId } = useBranch()
  const [checkins, setCheckins] = useState([])
  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCheckin, setShowCheckin] = useState(false)
  // Multi-select manual check-in. Set<member.id> is cheap to mutate + has O(1)
  // lookup for the checkbox-row "is this row selected?" check. Reset whenever
  // the form opens/closes so a stale selection doesn't leak into the next open.
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [pickerSearch, setPickerSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [gymName, setGymName] = useState('')
  const [gymLogo, setGymLogo] = useState('')
  const [bannerOpen, setBannerOpen] = useState(false)
  const [copiedCheckinUrl, setCopiedCheckinUrl] = useState(false)
  const qrRef = useRef(null)

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

    fetchGymDetails(gymId).then(g => { if (!cancelled && g) { setGymName(g.name || ''); setGymLogo(g.logo_url || '') } }).catch(() => {})

    Promise.all([
      fetchAttendance(gymId, selectedDate, selectedBranchId),
      fetchAttendanceSummary(gymId, 7, selectedBranchId),
      fetchMembers(gymId, selectedBranchId),
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
  }, [gymId, selectedDate, selectedBranchId])

  async function handleManualCheckin(e) {
    e.preventDefault()
    if (selectedIds.size === 0) return

    setSubmitting(true)
    // Promise.allSettled (not all): if Rajesh's row fails we still want
    // Priya and Karthik to be checked in. Then surface the failed names
    // so the front-desk operator knows who to retry.
    const ids = Array.from(selectedIds)
    const idToName = new Map(members.map((m) => [m.id, m.name]))
    const results = await Promise.allSettled(
      ids.map((id) => manualCheckin({ gymId, memberId: id })),
    )

    const newRows = []
    const failed = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') newRows.push(r.value)
      else failed.push(idToName.get(ids[i]) || 'Unknown member')
    })

    if (newRows.length > 0) {
      setCheckins((prev) => [...newRows, ...prev])
    }

    setSubmitting(false)

    if (failed.length === 0) {
      // All succeeded — close the form and clear selection
      setSelectedIds(new Set())
      setPickerSearch('')
      setShowCheckin(false)
    } else if (newRows.length === 0) {
      dialog.alert(`Failed to mark check-in for ${failed.join(', ')}.`)
    } else {
      // Partial success — keep the form open with only the failed members
      // still selected so the operator can investigate / retry.
      const failedIds = new Set(
        results
          .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
          .filter(Boolean),
      )
      setSelectedIds(failedIds)
      dialog.alert(
        `Checked in ${newRows.length} member${newRows.length === 1 ? '' : 's'}. ` +
        `Failed for: ${failed.join(', ')}.`,
      )
    }
  }

    function copyCheckinUrl() {
    navigator.clipboard.writeText(checkinUrl)
    setCopiedCheckinUrl(true)
    setTimeout(() => setCopiedCheckinUrl(false), 1500)
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
  if (loading) return <AttendanceSkeleton />

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
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {checkins.length} check-in{checkins.length !== 1 ? 's' : ''} {isToday ? 'today' : `on ${new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {isToday && (
            <button
              onClick={() => {
                if (showCheckin) {
                  // Closing — wipe any in-progress selection so reopen is clean
                  setSelectedIds(new Set())
                  setPickerSearch('')
                }
                setShowCheckin(!showCheckin)
              }}
              className="px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer"
            >
              {showCheckin ? 'Close' : '+ Mark Check-in'}
            </button>
          )}
        </div>
      </div>
            {/* Manual check-in form — multi-select with search.
                Operator can filter by name/phone, tick multiple members, then
                submit them all in one go. Bulk processing uses Promise.allSettled
                in handleManualCheckin so a single failing row doesn't block the
                rest. "Select all" + selected-count chip make a 10-member rush
                (e.g. a morning batch class) a 3-tap operation. */}
      {showCheckin && (() => {
        // Apply picker search filter to available members (already excludes
        // checked-in + inactive in availableMembers above).
        const q = pickerSearch.trim().toLowerCase()
        const visible = q
          ? availableMembers.filter(
              (m) =>
                (m.name || '').toLowerCase().includes(q) ||
                (m.phone || '').includes(q),
            )
          : availableMembers

        const visibleIds = visible.map((m) => m.id)
        const allVisibleSelected =
          visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

        const toggleOne = (id) => {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }
        const toggleAllVisible = () => {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id))
            else visibleIds.forEach((id) => next.add(id))
            return next
          })
        }
        const clearSelection = () => setSelectedIds(new Set())

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Manual Check-in</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tick members to check in, then submit. {availableMembers.length} available.
                </p>
              </div>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <X size={12} />
                  Clear ({selectedIds.size})
                </button>
              )}
            </div>

            {availableMembers.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                All active members have already checked in today.
              </p>
            ) : (
              <form onSubmit={handleManualCheckin}>
                {/* Search */}
                <div className="relative mb-3">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-shadow"
                  />
                </div>

                {/* Select-all row */}
                {visible.length > 0 && (
                  <label className="flex items-center gap-2.5 px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors mb-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      {allVisibleSelected ? 'Deselect all' : 'Select all'}
                      <span className="text-gray-400 font-normal ml-1">
                        ({visible.length} shown)
                      </span>
                    </span>
                  </label>
                )}

                {/* Member list */}
                <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {visible.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">
                      No members match "{pickerSearch}".
                    </p>
                  ) : (
                    visible.map((m) => {
                      const checked = selectedIds.has(m.id)
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            checked ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(m.id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                            {m.phone && (
                              <p className="text-xs text-gray-500 truncate">{m.phone}</p>
                            )}
                          </div>
                          {checked && (
                            <Check size={14} className="text-indigo-600 shrink-0" />
                          )}
                        </label>
                      )
                    })
                  )}
                </div>

                {/* Submit row */}
                <div className="flex items-center justify-between gap-3 mt-4">
                  <span className="text-xs text-gray-500">
                    {selectedIds.size === 0
                      ? 'No members selected'
                      : `${selectedIds.size} selected`}
                  </span>
                  <button
                    type="submit"
                    disabled={selectedIds.size === 0 || submitting}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? `Checking in ${selectedIds.size}…`
                      : selectedIds.size > 1
                        ? `Check in ${selectedIds.size} members`
                        : 'Check in'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      })()}

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
              onClick={copyCheckinUrl}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              {copiedCheckinUrl ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={downloadQR}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
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
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
              <p className="text-xs text-indigo-700 font-medium">
                You can also share the check-in link directly via WhatsApp — members bookmark it and tap to check in anytime.
              </p>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>



      {/* 7-day attendance chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Last 7 Days</h2>
          <p className="text-xs text-gray-400">{last7Days.reduce((s, d) => s + d.count, 0)} total check-ins</p>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={last7Days} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}
            onClick={(e) => e?.activePayload?.[0] && setSelectedDate(e.activePayload[0].payload.date)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={({ x, y, payload }) => {
              const isSelected = last7Days.find(d => d.label === payload.value)?.date === selectedDate
              return (
                <text x={x} y={y + 12} textAnchor="middle" fontSize={11}
                  fill={isSelected ? '#6366f1' : '#9ca3af'} fontWeight={isSelected ? 700 : 400}>
                  {payload.value}
                </text>
              )
            }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
                    <p className="text-gray-500">{new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                    <p className="font-semibold text-indigo-700 mt-0.5">{d.count} check-in{d.count !== 1 ? 's' : ''}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer' }}>
              {last7Days.map((day) => (
                <Cell key={day.date} fill={day.date === selectedDate ? '#6366f1' : '#c4b5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-gray-400 text-center mt-1">Click a bar to view that day's check-ins</p>
      </div>

      {/* Search */}
      {checkins.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search check-ins..."
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
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
