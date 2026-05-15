import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import {
  fetchGymCommSettings, updateGymCommSettings,
  fetchNotifications, sendTestNotification,
} from '../../services/notificationService'
import { useDialog } from '../../components/ui/Dialog'
import Pagination from '../../components/ui/Pagination'
import { Sk } from '../../components/ui/Skeleton'

function CommunicationSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="space-y-2"><Sk h={28} w={180} /><Sk h={14} w={280} /></div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="space-y-1.5"><Sk h={16} w={100} /><Sk h={12} w={220} /></div>
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-t border-gray-100">
            <div className="space-y-1.5"><Sk h={14} w={160} /><Sk h={11} w={240} /></div>
            <Sk h={24} w={44} r={99} />
          </div>
        ))}
        <Sk h={38} w={120} r={10} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <Sk h={16} w={120} /><Sk h={12} w={260} />
        <div className="flex gap-3"><Sk h={36} w={160} r={10} /><Sk h={36} w={120} r={10} /></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between">
          <div className="space-y-1.5"><Sk h={16} w={140} /><Sk h={12} w={200} /></div>
          <div className="flex gap-2"><Sk h={34} w={100} r={8} /><Sk h={34} w={100} r={8} /></div>
        </div>
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 px-5 py-3.5 border-b border-gray-50">
            {Array(5).fill(0).map((_, j) => <Sk key={j} h={12} w="80%" />)}
          </div>
        ))}
      </div>
    </div>
  )
}

const TYPE_LABEL = {
  payment_reminder:     'Payment reminder',
  expiry_alert:         'Expiry alert',
  daily_summary:        'Daily summary',
  payment_confirmation: 'Payment confirmation',
  welcome:              'Welcome / test',
}

function StatusBadge({ status }) {
  const cls =
    status === 'sent'    ? 'bg-green-50 text-green-700' :
    status === 'partial' ? 'bg-amber-50 text-amber-700' :
    status === 'failed'  ? 'bg-red-50  text-red-700'   :
                           'bg-gray-100 text-gray-500'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
    {status[0].toUpperCase() + status.slice(1)}
  </span>
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer ${
        value ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function formatRelative(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function CommunicationPage() {
  const dialog = useDialog()
  const { gymId } = useAuth()

  const [prefs, setPrefs] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [notifPage, setNotifPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchGymCommSettings(gymId),
      fetchNotifications(gymId, { limit: 50 }),
    ])
      .then(([p, n]) => { if (!cancelled) { setPrefs(p); setNotifs(n) } })
      .catch((err) => console.error('Failed to load comm settings:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  const notifTotalPages = Math.max(1, Math.ceil(notifs.length / PAGE_SIZE))
  const safeNotifPage = Math.min(notifPage, notifTotalPages)
  const pagedNotifs = notifs.slice((safeNotifPage - 1) * PAGE_SIZE, safeNotifPage * PAGE_SIZE)

  async function refreshNotifs() {
    try {
      const n = await fetchNotifications(gymId, {
        type: filterType || null,
        status: filterStatus || null,
        limit: 50,
      })
      setNotifs(n)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { if (!loading) { setNotifPage(1); refreshNotifs() } }, [filterType, filterStatus])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateGymCommSettings(gymId, prefs)
      setPrefs(updated)
      dialog.alert('Settings saved')
    } catch (err) {
      dialog.alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest(channel) {
    setTesting(channel)
    try {
      await sendTestNotification(channel)
      dialog.alert(`Test ${channel} sent. Check your ${channel === 'email' ? 'inbox' : 'WhatsApp'}.`)
      refreshNotifs()
    } catch (err) {
      dialog.alert(err.message || `Failed to send test ${channel}`)
    } finally {
      setTesting(null)
    }
  }

  if (loading || !prefs) return <CommunicationSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage how members and you receive messages.</p>
      </div>

      {/* ── Channels card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Channels</h2>
        <p className="text-xs text-gray-500 mb-5">Disable a channel to stop using it for any notification.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp messages</p>
              <p className="text-xs text-gray-500 mt-0.5">Payment reminders, expiry alerts, daily summary</p>
            </div>
            <Toggle value={prefs.whatsapp_enabled} onChange={(v) => setPrefs({ ...prefs, whatsapp_enabled: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-xs text-gray-500 mt-0.5">Payment receipts and fallback when WhatsApp fails</p>
            </div>
            <Toggle value={prefs.email_enabled} onChange={(v) => setPrefs({ ...prefs, email_enabled: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Daily summary</p>
              <p className="text-xs text-gray-500 mt-0.5">8 AM digest with pending payments and expiring members</p>
            </div>
            <Toggle value={prefs.daily_summary_enabled} onChange={(v) => setPrefs({ ...prefs, daily_summary_enabled: v })} />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 px-5 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ── Test card ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Test channels</h2>
        <p className="text-xs text-gray-500 mb-5">Send a test message to your account to verify the integration works.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleTest('whatsapp')}
            disabled={testing != null}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {testing === 'whatsapp' && <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
            Send test WhatsApp
          </button>
          <button
            onClick={() => handleTest('email')}
            disabled={testing != null}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {testing === 'email' && <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
            Send test email
          </button>
        </div>
      </div>

      {/* ── Activity log ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent activity</h2>
            <p className="text-xs text-gray-500 mt-0.5">Last 50 notifications across all channels</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-indigo-500"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="partial">Partial</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {notifs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No notifications yet.</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here as messages are sent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Recipient</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Channels</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedNotifs.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-700">{TYPE_LABEL[n.type] || n.type}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {n.member?.name || <span className="text-gray-400">Owner / system</span>}
                      {n.member?.phone && <p className="text-xs text-gray-400">{n.member.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{(n.channels || []).join(' + ')}</td>
                    <td className="px-5 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">{formatRelative(n.sent_at || n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={safeNotifPage} totalPages={notifTotalPages} total={notifs.length} pageSize={PAGE_SIZE} onPageChange={setNotifPage} />
          </div>
        )}
      </div>
    </div>
  )
}
