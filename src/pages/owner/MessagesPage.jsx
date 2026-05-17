import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { fetchContactMessages, markMessageRead, deleteContactMessage, clearAllMessages } from '../../services/contactService'
import { useDialog } from '../../components/ui/Dialog'
import Pagination from '../../components/ui/Pagination'
import { Sk } from '../../components/ui/Skeleton'

function MessagesSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="space-y-2"><Sk h={28} w={140} /><Sk h={14} w={260} /></div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 space-y-1.5">
          <Sk h={16} w={80} /><Sk h={12} w={100} />
        </div>
        {Array(7).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50">
            <Sk h={8} w={8} r={99} />
            <div className="flex-1 space-y-1.5">
              <Sk h={13} w="40%" />
              <Sk h={11} w="55%" />
              <Sk h={11} w="70%" />
            </div>
            <Sk h={11} w={48} />
            <Sk h={16} w={16} r={4} />
          </div>
        ))}
      </div>
    </div>
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

export default function MessagesPage() {
  const dialog = useDialog()
  const { gymId } = useAuth()

  const [enquiries, setEnquiries] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enquiryPage, setEnquiryPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchContactMessages(gymId)
      .then((e) => { if (!cancelled) setEnquiries(e) })
      .catch((err) => console.error('Failed to load messages:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [gymId])

  async function handleMarkRead(id) {
    await markMessageRead(id).catch(() => {})
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, read: true } : e))
  }

  async function handleDeleteEnquiry(id) {
    if (!await dialog.confirm('Delete this message?')) return
    await deleteContactMessage(id).catch(() => {})
    setEnquiries(prev => prev.filter(e => e.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  async function handleClearAll() {
    if (!await dialog.confirm('Delete all messages? This cannot be undone.')) return
    await clearAllMessages(gymId)
    setEnquiries([])
    setExpandedId(null)
  }

  function handleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
    const msg = enquiries.find(e => e.id === id)
    if (msg && !msg.read) handleMarkRead(id)
  }

  const unread = enquiries.filter(e => !e.read).length

  const enquiryTotalPages = Math.max(1, Math.ceil(enquiries.length / PAGE_SIZE))
  const safeEnquiryPage = Math.min(enquiryPage, enquiryTotalPages)
  const pagedEnquiries = enquiries.slice((safeEnquiryPage - 1) * PAGE_SIZE, safeEnquiryPage * PAGE_SIZE)

  if (loading) return <MessagesSkeleton />

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enquiries and messages from your gym website.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Inbox
              {unread > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {unread}
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{enquiries.length} message{enquiries.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {enquiries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Enquiries from your gym website will appear here.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {pagedEnquiries.map(msg => (
                <div key={msg.id} className={`transition-colors ${!msg.read ? 'bg-indigo-50/40' : ''}`}>
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50/60 transition-colors"
                    onClick={() => handleExpand(msg.id)}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${!msg.read ? 'bg-indigo-500' : 'bg-transparent'}`} />
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

                  {expandedId === msg.id && (
                    <div className="px-5 pb-4 pl-10 space-y-3">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`mailto:${msg.email}?subject=Re: Your enquiry&body=Hi ${msg.name},%0A%0A`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Reply via Email
                        </a>
                        {msg.phone && (
                          <a
                            href={`https://wa.me/${msg.phone.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(msg.name)}, thanks for reaching out to us!`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            Reply on WhatsApp
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteEnquiry(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 border border-red-100 transition-colors cursor-pointer"
                        >
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
            <Pagination page={safeEnquiryPage} totalPages={enquiryTotalPages} total={enquiries.length} pageSize={PAGE_SIZE} onPageChange={setEnquiryPage} />
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleClearAll}
                className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
