import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchAttendance, fetchAttendanceSummary, manualCheckin, fetchMembers } from '../../services/membershipService'
import { useDialog } from '../../components/ui/Dialog'
import CustomSelect from '../../components/ui/CustomSelect'

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

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    setLoading(true)
    let cancelled = false

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
          onChange={(e) => setSearch(e.target.value)}
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
                {filteredCheckins.map((checkin) => (
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
                        {new Date(checkin.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
