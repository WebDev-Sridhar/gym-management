import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import {
  fetchCategories, fetchPopularFaqs, fetchAllFaqs,
  fetchFaqCategoryCounts, incrementFaqView,
  createTicket, fetchMyTickets,
} from '../../services/supportService'
import {
  HelpCircle, X, Search, ArrowLeft, ChevronRight, Sparkles,
  MessageCircle, CheckCircle2, AlertTriangle, ThumbsUp, ThumbsDown,
  Loader2, Send, ExternalLink, Rocket, CreditCard, Users, UserCheck,
  QrCode, Globe, MessageSquare, Crown, Lock,
} from 'lucide-react'

// ── shared constants ────────────────────────────────────────────────────────
const LUCIDE_MAP = {
  Rocket, CreditCard, Users, UserCheck, QrCode, Globe,
  MessageSquare, Crown, Lock, AlertTriangle,
}

const PRIORITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const STATUS_BADGE = {
  open:     { label: 'Open',     bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700'   },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  closed:   { label: 'Closed',   bg: 'bg-gray-100',   text: 'text-gray-500'    },
}

const SUGGESTED_PROMPTS = [
  'How do I connect Razorpay?',
  'How to add trainers?',
  'Why aren\'t WhatsApp reminders sending?',
  'How to publish my website?',
]

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtRelative(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)   return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function scoreFaqs(query, faqs) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)
  const scored = []
  for (const faq of faqs) {
    const question = (faq.question || '').toLowerCase()
    const answer   = (faq.answer   || '').toLowerCase()
    const keywords = (faq.keywords || []).map(k => k.toLowerCase())
    let score = 0
    for (const t of terms) {
      if (question.includes(t)) score += 10
      if (keywords.some(k => k.includes(t))) score += 5
      if (answer.includes(t))   score += 2
    }
    if (question === q) score += 30
    if (faq.is_pinned) score += 1
    if (score > 0) scored.push({ faq, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.faq)
}

function highlightMatch(text, query) {
  if (!query || !text) return text
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return text
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  return String(text).split(re).map((part, i) =>
    re.test(part)
      ? <mark key={i} className="bg-indigo-100 text-indigo-900 rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

function renderMarkdownish(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />
    const inline = (s) => s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    const numMatch = /^(\d+)\.\s+(.+)/.exec(line)
    if (numMatch) {
      return (
        <div key={i} className="flex gap-2 py-0.5">
          <span className="text-xs font-bold text-indigo-600 mt-0.5 shrink-0">{numMatch[1]}.</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: inline(numMatch[2]) }} />
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex gap-2 py-0.5">
          <span className="text-gray-400 mt-0.5 shrink-0">•</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }} />
        </div>
      )
    }
    return <p key={i} className="py-0.5" dangerouslySetInnerHTML={{ __html: inline(line) }} />
  })
}

function getCategoryIcon(name) { return LUCIDE_MAP[name] || HelpCircle }

// ── routes where the widget should NOT appear ─────────────────────────────
const HIDDEN_ROUTES = ['/owner-dashboard/help']

// ════════════════════════════════════════════════════════════════════════════
// Main widget
// ════════════════════════════════════════════════════════════════════════════
export default function SupportWidget() {
  const { user, profile, gymId, gymName } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [open, setOpen]           = useState(false)
  const [hasOpened, setHasOpened] = useState(false)   // for first-time pulse
  const [view, setView]           = useState('home')  // home | search | article | ticket | tickets | success

  // Data — fetched once on first open and cached
  const [categories, setCategories] = useState([])
  const [popular,    setPopular]    = useState([])
  const [allFaqs,    setAllFaqs]    = useState([])
  const [counts,     setCounts]     = useState({})
  const [tickets,    setTickets]    = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading,    setLoading]    = useState(false)

  // View state
  const [search, setSearch]                       = useState('')
  const debouncedSearch                           = useDebounce(search, 200)
  const [selectedFaq, setSelectedFaq]             = useState(null)
  const [activeCategory, setActiveCategory]       = useState(null)
  const [lastTicket, setLastTicket]               = useState(null)

  const panelRef = useRef(null)

  // Don't render on Help page (where the full hub already lives).
  // NOTE: we still call all hooks below — early return goes at the *end*
  // to satisfy the Rules of Hooks.
  const hidden = HIDDEN_ROUTES.includes(location.pathname) || !gymId

  // ── one-time pulse on first paint ────────────────────────────────────
  useEffect(() => {
    if (open) setHasOpened(true)
  }, [open])

  // ── fetch on first open ──────────────────────────────────────────────
  useEffect(() => {
    if (!open || dataLoaded || !user?.id) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCategories(),
      fetchPopularFaqs(6),
      fetchAllFaqs(),
      fetchFaqCategoryCounts(),
      fetchMyTickets(user.id),
    ])
      .then(([cats, pop, all, cnts, tks]) => {
        if (cancelled) return
        setCategories(cats)
        setPopular(pop)
        setAllFaqs(all)
        setCounts(cnts)
        setTickets(tks)
        setDataLoaded(true)
      })
      .catch(err => console.error('SupportWidget fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, dataLoaded, user?.id])

  // ── switch to search view when typing ────────────────────────────────
  useEffect(() => {
    if (debouncedSearch.trim() && view === 'home') setView('search')
    if (!debouncedSearch.trim() && view === 'search' && !activeCategory) setView('home')
  }, [debouncedSearch, view, activeCategory])

  // ── close panel with Esc ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key !== 'Escape') return
      // Esc steps back through views rather than closing outright
      if (view === 'article' || view === 'ticket' || view === 'tickets' || view === 'success') {
        goHome()
      } else {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, view])

  // ── derived data ─────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return []
    return scoreFaqs(debouncedSearch, allFaqs).slice(0, 12)
  }, [debouncedSearch, allFaqs])

  const categoryFaqs = useMemo(() => {
    if (!activeCategory) return []
    return allFaqs.filter(f => f.category_id === activeCategory.id)
  }, [activeCategory, allFaqs])

  const relatedFaqs = useMemo(() => {
    if (!selectedFaq) return []
    return allFaqs
      .filter(f => f.id !== selectedFaq.id && f.category_id === selectedFaq.category_id)
      .slice(0, 3)
  }, [selectedFaq, allFaqs])

  // Cooldown for tickets
  const lastTicketAge = tickets[0]
    ? Math.floor((Date.now() - new Date(tickets[0].created_at).getTime()) / 1000)
    : Infinity
  const onCooldown = lastTicketAge < 60
  const cooldownRemaining = Math.max(0, 60 - lastTicketAge)

  // ── actions ──────────────────────────────────────────────────────────
  function goHome() {
    setView('home')
    setSelectedFaq(null)
    setActiveCategory(null)
    setSearch('')
  }

  function openArticle(faq) {
    setSelectedFaq(faq)
    setView('article')
    incrementFaqView(faq.id)
  }

  function openCategory(cat) {
    setActiveCategory(cat)
    setSearch('')
    setView('search')
  }

  async function submitTicket(payload) {
    const ticket = await createTicket({
      gymId,
      userId: user.id,
      email: profile?.email || user?.email || '',
      ...payload,
    })
    setTickets(prev => [ticket, ...prev])
    setLastTicket(ticket)
    setView('success')
  }

  const HeaderTitle = useMemo(() => {
    switch (view) {
      case 'article': return selectedFaq?.category?.name || 'Article'
      case 'ticket':  return 'Contact Support'
      case 'success': return 'Ticket submitted'
      case 'tickets': return 'Your Tickets'
      case 'search':  return activeCategory ? activeCategory.name : 'Search'
      default:        return 'Gymmobius Support'
    }
  }, [view, selectedFaq, activeCategory])

  const showBack = view !== 'home'

  // All hooks above this line have been called unconditionally — safe to bail now.
  if (hidden) return null

  return (
    <>
      {/* ── Floating launcher button ─────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            aria-label="Open support"
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] group"
            style={{ touchAction: 'manipulation' }}
          >
            {/* Pulse halo — only before first open */}
            {!hasOpened && (
              <span className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping" />
            )}
            <span
              className="relative flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white font-semibold text-sm shadow-lg transition-shadow group-hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                boxShadow: '0 10px 32px -8px rgba(99, 102, 241, 0.5)',
              }}
            >
              <HelpCircle size={18} strokeWidth={2.2} />
              <span className="hidden sm:inline">Help</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mobile backdrop ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[55] sm:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={`
              fixed z-[60] bg-white shadow-2xl overflow-hidden flex flex-col
              inset-x-3 bottom-3 top-16
              sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-auto
              sm:w-[400px] sm:h-[640px] sm:max-h-[calc(100vh-3rem)]
              rounded-3xl border border-gray-200
            `}
          >
            {/* Header */}
            <div
              className="relative px-5 py-4 shrink-0 text-white overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #8b5cf6 100%)' }}
            >
              {/* Decorative orb */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {showBack ? (
                    <button
                      onClick={goHome}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors cursor-pointer shrink-0"
                      aria-label="Back"
                    >
                      <ArrowLeft size={15} />
                    </button>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                      <Sparkles size={15} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight truncate">{HeaderTitle}</p>
                    {view === 'home' && (
                      <p className="text-[11px] text-indigo-100/90 mt-0.5">Find answers instantly</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors cursor-pointer shrink-0"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body — switches by view */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              {loading && !dataLoaded ? (
                <SkeletonBody />
              ) : view === 'home' ? (
                <HomeView
                  user={user}
                  profile={profile}
                  search={search}
                  setSearch={setSearch}
                  categories={categories}
                  counts={counts}
                  popular={popular}
                  tickets={tickets}
                  onSearch={() => setView('search')}
                  onPickPrompt={(p) => { setSearch(p); setView('search') }}
                  onOpenCategory={openCategory}
                  onOpenArticle={openArticle}
                  onViewTickets={() => setView('tickets')}
                  onCreateTicket={() => setView('ticket')}
                />
              ) : view === 'search' ? (
                <SearchView
                  search={search}
                  setSearch={setSearch}
                  query={debouncedSearch}
                  activeCategory={activeCategory}
                  results={activeCategory ? categoryFaqs : searchResults}
                  categories={categories}
                  onOpenArticle={openArticle}
                  onOpenCategory={openCategory}
                  onCreateTicket={() => setView('ticket')}
                  onClearCategory={() => { setActiveCategory(null); goHome() }}
                />
              ) : view === 'article' ? (
                <ArticleView
                  faq={selectedFaq}
                  related={relatedFaqs}
                  onOpenArticle={openArticle}
                  onCreateTicket={() => setView('ticket')}
                />
              ) : view === 'ticket' ? (
                <TicketView
                  categories={categories}
                  profile={profile}
                  gymName={gymName}
                  onCancel={() => setView('home')}
                  onSubmit={submitTicket}
                  onCooldown={onCooldown}
                  cooldownRemaining={cooldownRemaining}
                  defaultCategory={selectedFaq?.category?.slug}
                />
              ) : view === 'success' ? (
                <SuccessView
                  ticket={lastTicket}
                  onDone={goHome}
                  onViewTickets={() => setView('tickets')}
                />
              ) : view === 'tickets' ? (
                <TicketsListView
                  tickets={tickets}
                  onCreateTicket={() => setView('ticket')}
                  onOpenFullPage={() => { setOpen(false); navigate('/owner-dashboard/help') }}
                />
              ) : null}
            </div>

            {/* Footer */}
            {view === 'home' && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 shrink-0">
                <button
                  onClick={() => { setOpen(false); navigate('/owner-dashboard/help') }}
                  className="w-full text-xs font-medium text-gray-500 hover:text-indigo-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer py-1"
                >
                  Open the full help center <ExternalLink size={11} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Views
// ════════════════════════════════════════════════════════════════════════════

function SkeletonBody() {
  return (
    <div className="p-5 space-y-4">
      <div className="h-11 bg-gray-100 rounded-xl skeleton-shimmer" />
      <div className="flex gap-2">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-7 w-20 bg-gray-100 rounded-full skeleton-shimmer" />)}
      </div>
      <div className="space-y-2">
        {Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl skeleton-shimmer" />)}
      </div>
    </div>
  )
}

function HomeView({
  user, profile, search, setSearch, categories, counts, popular, tickets,
  onPickPrompt, onOpenCategory, onOpenArticle, onViewTickets, onCreateTicket,
}) {
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    const first = (profile?.name || '').split(' ')[0]
    const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
    return first ? `${time}, ${first}` : `${time}!`
  }, [profile])

  return (
    <div className="p-5 space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-base font-semibold text-gray-900">{greeting}</p>
        <p className="text-xs text-gray-500 mt-0.5">How can we help you today?</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles…"
          className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>

      {/* Suggested prompts */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Try Asking</p>
        <div className="flex flex-col gap-1.5">
          {SUGGESTED_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => onPickPrompt(p)}
              className="text-left flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-indigo-900 font-medium">{p}</span>
              <ChevronRight size={12} className="text-indigo-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categories</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {categories.map(c => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <button
                key={c.id}
                onClick={() => onOpenCategory(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Icon size={12} />
                {c.name}
                <span className="text-[10px] text-gray-400 font-semibold">{counts[c.id] || 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Popular FAQs */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Popular</p>
        <div className="space-y-1.5">
          {popular.slice(0, 5).map(f => (
            <button
              key={f.id}
              onClick={() => onOpenArticle(f)}
              className="w-full text-left flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug">{f.question}</p>
                {f.category && (
                  <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wide">
                    {f.category.name}
                  </span>
                )}
              </div>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-500 shrink-0 mt-0.5 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent tickets snapshot */}
      {tickets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Tickets</p>
            <button onClick={onViewTickets} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
              View all
            </button>
          </div>
          <div className="space-y-1.5">
            {tickets.slice(0, 2).map(t => {
              const b = STATUS_BADGE[t.status] || STATUS_BADGE.open
              return (
                <div key={t.id} className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{t.subject}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtRelative(t.created_at)}</p>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${b.bg} ${b.text}`}>
                    {b.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <button
        onClick={onCreateTicket}
        className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
      >
        <MessageCircle size={13} /> Can't find an answer? Contact us
      </button>
    </div>
  )
}

function SearchView({
  search, setSearch, query, activeCategory, results,
  onOpenArticle, onCreateTicket, onClearCategory,
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky search bar */}
      {!activeCategory && (
        <div className="sticky top-0 z-10 px-5 pt-4 pb-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles…"
              autoFocus
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {activeCategory && (
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <p className="text-[11px] text-gray-500">
            Showing <span className="font-semibold text-gray-800">{results.length}</span> articles
          </p>
          <button onClick={onClearCategory} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
            Clear filter
          </button>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {results.length === 0 ? (
          <EmptyResults onCreateTicket={onCreateTicket} />
        ) : (
          <div className="space-y-1.5">
            {results.map(f => (
              <button
                key={f.id}
                onClick={() => onOpenArticle(f)}
                className="w-full text-left flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2 leading-snug">
                    {query ? highlightMatch(f.question, query) : f.question}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">
                    {query ? highlightMatch(f.answer.slice(0, 140), query) : f.answer.slice(0, 140)}…
                  </p>
                  {f.category && (
                    <span className="inline-block mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wide">
                      {f.category.name}
                    </span>
                  )}
                </div>
                <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyResults({ onCreateTicket }) {
  return (
    <div className="py-10 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
        <Search size={18} className="text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-700">No answer found</p>
      <p className="text-xs text-gray-400 mt-1 mb-4">We couldn't find an article that matches.</p>
      <button
        onClick={onCreateTicket}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
      >
        <MessageCircle size={12} /> Contact support
      </button>
    </div>
  )
}

function ArticleView({ faq, related, onOpenArticle, onCreateTicket }) {
  const [feedback, setFeedback] = useState(null)

  if (!faq) return null

  return (
    <div className="p-5">
      <h2 className="text-base font-bold text-gray-900 leading-snug mb-3">{faq.question}</h2>
      <div className="text-xs text-gray-700 leading-relaxed">
        {renderMarkdownish(faq.answer)}
      </div>

      {/* Feedback */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        {!feedback ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Was this helpful?</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFeedback('up')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer transition-colors"
              >
                <ThumbsUp size={11} /> Yes
              </button>
              <button
                onClick={() => setFeedback('down')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700 cursor-pointer transition-colors"
              >
                <ThumbsDown size={11} /> No
              </button>
            </div>
          </div>
        ) : feedback === 'up' ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-emerald-700 font-medium">
            <CheckCircle2 size={13} /> Thanks for letting us know!
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-900 mb-1">Sorry this didn't help.</p>
            <p className="text-[11px] text-amber-700 mb-3">Create a support ticket and our team will respond directly.</p>
            <button
              onClick={onCreateTicket}
              className="w-full px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={11} /> Contact support
            </button>
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Related</p>
          <div className="space-y-1.5">
            {related.map(r => (
              <button
                key={r.id}
                onClick={() => onOpenArticle(r)}
                className="w-full flex items-center justify-between gap-3 p-2.5 bg-gray-50 border border-gray-100 rounded-lg hover:border-indigo-200 hover:bg-white transition-colors text-left group cursor-pointer"
              >
                <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">{r.question}</span>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TicketView({
  categories, profile, gymName, onCancel, onSubmit, onCooldown, cooldownRemaining, defaultCategory,
}) {
  const [subject, setSubject]   = useState('')
  const [category, setCategory] = useState(defaultCategory || 'other')
  const [priority, setPriority] = useState('normal')
  const [message, setMessage]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (subject.trim().length < 4)  return setError('Subject must be at least 4 characters.')
    if (message.trim().length < 20) return setError('Please describe your issue in at least 20 characters.')
    if (onCooldown) return

    setSubmitting(true)
    try {
      await onSubmit({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
        screenshotUrl: null,
      })
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Auto-fill notice */}
      <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
        <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
        <span>
          Reply will be sent to{' '}
          <span className="font-semibold text-gray-700 break-all">{profile?.email || '—'}</span>
          {gymName && <> · <span className="font-semibold text-gray-700">{gymName}</span></>}
        </span>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          autoFocus
        />
      </div>

      {/* Category + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          >
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          >
            {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1.5">
          Message <span className="text-gray-400 font-normal">({message.length}/2000)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 2000))}
          placeholder="What happened? What did you expect?"
          rows={5}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      {onCooldown && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[11px] text-amber-800 flex items-center gap-2">
          <AlertTriangle size={11} className="shrink-0" />
          Wait {cooldownRemaining}s before submitting another ticket.
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || onCooldown}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          {submitting && <Loader2 size={11} className="animate-spin" />}
          {submitting ? 'Submitting…' : (<><Send size={11} /> Submit</>)}
        </button>
      </div>
    </form>
  )
}

function SuccessView({ ticket, onDone, onViewTickets }) {
  return (
    <div className="px-5 py-10 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
      >
        <CheckCircle2 size={28} className="text-emerald-600" />
      </motion.div>
      <h3 className="text-base font-bold text-gray-900">Your request has been submitted</h3>
      <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
        Expected response time: <span className="font-semibold text-gray-700">1–2 business days</span>.
        We'll email you when there's an update.
      </p>

      {ticket && (
        <div className="mt-5 inline-block bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Ticket ID</p>
          <p className="text-xs font-mono font-semibold text-gray-700">#{ticket.id.slice(0, 8)}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-6 justify-center">
        <button
          onClick={onViewTickets}
          className="px-4 py-2 border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg hover:border-gray-300 cursor-pointer"
        >
          View tickets
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function TicketsListView({ tickets, onCreateTicket, onOpenFullPage }) {
  return (
    <div className="p-5">
      {tickets.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <MessageCircle size={18} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No tickets yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Submit a ticket and we'll respond within 1–2 days.</p>
          <button
            onClick={onCreateTicket}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
          >
            <MessageCircle size={11} /> Create ticket
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map(t => {
              const b = STATUS_BADGE[t.status] || STATUS_BADGE.open
              return (
                <div key={t.id} className="p-3 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-2 flex-1">{t.subject}</p>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${b.bg} ${b.text}`}>
                      {b.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">{t.category} · {fmtRelative(t.created_at)}</p>
                  <p className="text-[11px] text-gray-600 mt-2 line-clamp-2 leading-snug">{t.message}</p>
                </div>
              )
            })}
          </div>
          <button
            onClick={onOpenFullPage}
            className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            Manage in help center <ExternalLink size={11} />
          </button>
        </>
      )}
    </div>
  )
}
