import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { fetchContactMessages, markMessageRead, markAllMessagesRead } from '../../services/contactService'


const routeTitles = {
  '/owner-dashboard': 'Dashboard',
  '/trainer-dashboard': 'Trainer Dashboard',
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = iso.endsWith('Z') || iso.includes('+') || iso.includes('-', 10) ? iso : iso + 'Z'
  const ms = Date.now() - new Date(s).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Topbar({ title }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { gymId, role, profile } = useAuth()
  const isOwner   = role === 'owner'

  const [enquiries, setEnquiries]   = useState([])
  const [panelOpen, setPanelOpen]   = useState(false)
  const panelRef = useRef(null)

  const pageTitle = title || routeTitles[location.pathname] || (() => {
    const seg = location.pathname.split('/').pop()
    return seg ? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ') : 'Dashboard'
  })()

  const loadEnquiries = useCallback(async () => {
    if (!gymId || !isOwner) return
    try {
      const msgs = await fetchContactMessages(gymId)
      setEnquiries(msgs)
    } catch { /* silent */ }
  }, [gymId, isOwner])

  useEffect(() => { loadEnquiries() }, [loadEnquiries])

  // Poll every 60 s for new enquiries
  useEffect(() => {
    if (!isOwner) return
    const id = setInterval(loadEnquiries, 60000)
    return () => clearInterval(id)
  }, [loadEnquiries, isOwner])

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return
    function onDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setPanelOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [panelOpen])

  async function handleClearAll() {
    await markAllMessagesRead(gymId).catch(() => {})
    setEnquiries([])
  }

  async function handleEnquiryClick(msg) {
    if (!msg.read) {
      await markMessageRead(msg.id).catch(() => {})
      setEnquiries(prev => prev.map(e => e.id === msg.id ? { ...e, read: true } : e))
    }
    setPanelOpen(false)
    navigate('/owner-dashboard/communication')
  }

  const unread = enquiries.filter(e => !e.read).length
  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 z-30 relative">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 w-56">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search…"
              className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full" />
          </div>

          {/* Notification bell — owners only */}
          {isOwner && (
            <button
              onClick={() => setPanelOpen(v => !v)}
              className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )}

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
        </div>
      </header>

      {/* Notification panel */}
      {isOwner && (
        <>
          {/* Backdrop */}
          {panelOpen && (
            <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setPanelOpen(false)} />
          )}

          {/* Slide-in panel */}
          <div
            ref={panelRef}
            className="fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
            style={{ transform: panelOpen ? 'translateX(0)' : 'translateX(100%)' }}
          >
            {/* Panel header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                {unread > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {enquiries.length > 0 && (
                  <button onClick={handleClearAll}
                    className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                    Clear all
                  </button>
                )}
                <button onClick={() => setPanelOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Section label */}
            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Website Enquiries</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {enquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No enquiries yet</p>
                  <p className="text-xs text-gray-400">Messages from your website contact form will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {enquiries.map(msg => (
                    <button
                      key={msg.id}
                      onClick={() => handleEnquiryClick(msg)}
                      className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-3 ${!msg.read ? 'bg-violet-50/50' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm shrink-0 mt-0.5">
                        {msg.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${!msg.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {msg.name}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(msg.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{msg.email}</p>
                        <p className="text-xs text-gray-400 truncate mt-1 line-clamp-2">{msg.message}</p>
                      </div>
                      {!msg.read && (
                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-2 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 shrink-0">
              <button
                onClick={() => { setPanelOpen(false); navigate('/owner-dashboard/communication') }}
                className="w-full py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer"
              >
                View all in Communication →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
