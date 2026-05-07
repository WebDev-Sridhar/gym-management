import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import {
  fetchGymCommSettings, updateGymCommSettings,
  fetchNotifications, sendTestNotification,
} from '../../services/notificationService'
import { fetchContactMessages, markMessageRead, deleteContactMessage } from '../../services/contactService'
import { useDialog } from '../../components/ui/Dialog'

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
        value ? 'bg-violet-600' : 'bg-gray-300'
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
  const [enquiries, setEnquiries] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchGymCommSettings(gymId),
      fetchNotifications(gymId, { limit: 50 }),
      fetchContactMessages(gymId),
    ])
      .then(([p, n, e]) => { if (!cancelled) { setPrefs(p); setNotifs(n); setEnquiries(e) } })
      .catch((err) => console.error('Failed to load comm settings:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  async function handleMarkRead(id) {
    await markMessageRead(id).catch(() => {})
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, read: true } : e))
  }

  async function handleDeleteEnquiry(id) {
    if (!await dialog.confirm('Delete this enquiry?')) return
    await deleteContactMessage(id).catch(() => {})
    setEnquiries(prev => prev.filter(e => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  function handleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
    const msg = enquiries.find(e => e.id === id)
    if (msg && !msg.read) handleMarkRead(id)
  }

  const unread = enquiries.filter(e => !e.read).length

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

  useEffect(() => { if (!loading) refreshNotifs() }, [filterType, filterStatus])

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

  if (loading || !prefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Communication</h1>
        <p className="text-sm text-gray-500 mt-1">Manage how members and you receive messages.</p>
      </div>

              {/* ── Website Enquiries ── */}
           <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                Website Enquiries
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                    {unread}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Messages submitted via your gym's contact page</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">{enquiries.length} total</span>
        </div>

        {enquiries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No enquiries yet</p>
            <p className="text-xs text-gray-400 mt-1">Messages from your website contact form will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {enquiries.map(msg => (
              <div key={msg.id} className={`transition-colors ${!msg.read ? 'bg-violet-50/40' : ''}`}>
                {/* Row header */}
                <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50/60 transition-colors"
                  onClick={() => handleExpand(msg.id)}>
                  {/* Unread dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${!msg.read ? 'bg-violet-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!msg.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {msg.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {msg.email}{msg.phone ? ` · ${msg.phone}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.message}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{formatRelative(msg.created_at)}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === msg.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded body */}
                {expandedId === msg.id && (
                  <div className="px-5 pb-4 pl-10 space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                      {msg.message}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`mailto:${msg.email}?subject=Re: Your enquiry&body=Hi ${msg.name},%0A%0A`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Reply via Email
                      </a>
                      {msg.phone && (
                        <a href={`https://wa.me/${msg.phone.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(msg.name)}, thanks for reaching out to us!`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Reply on WhatsApp
                        </a>
                      )}
                      <button onClick={() => handleDeleteEnquiry(msg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 border border-red-100 transition-colors cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
          className="mt-6 px-5 py-2.5 bg-violet-600 text-white font-medium text-sm rounded-lg hover:bg-violet-700 transition-colors cursor-pointer disabled:opacity-50"
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
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-violet-500"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-violet-500"
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
                {notifs.map((n) => (
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
          </div>
        )}
      </div>

   
 
    </div>
  )
}
