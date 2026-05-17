import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../store/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import {
  fetchCategories, fetchPopularFaqs, fetchAllFaqs, fetchFaqsByCategory,
  fetchFaqCategoryCounts, incrementFaqView,
  createTicket, fetchMyTickets, reopenTicket, uploadTicketScreenshot,
} from '../../services/supportService'
import FormModal from '../../components/ui/FormModal'
import CustomSelect from '../../components/ui/CustomSelect'
import { Sk } from '../../components/ui/Skeleton'
import {
  Search, Sparkles, ArrowRight, X, Send, ChevronRight, ChevronDown,
  TrendingUp, HelpCircle, MessageCircle, CheckCircle2, AlertTriangle,
  ThumbsUp, ThumbsDown, RefreshCw, Image as ImageIcon, Loader2,
  // Category icons
  Rocket, CreditCard, Users, UserCheck, QrCode, Globe, MessageSquare,
  Crown, Lock, Paperclip,
} from 'lucide-react'

// Map of lucide icon names (stored in DB) → components
const LUCIDE_MAP = {
  Rocket, CreditCard, Users, UserCheck, QrCode, Globe,
  MessageSquare, Crown, Lock, AlertTriangle,
}

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'bg-gray-100 text-gray-600' },
  { value: 'normal', label: 'Normal', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'high',   label: 'High',   color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

const STATUS_BADGE = {
  open:     { label: 'Open',     bg: 'bg-indigo-50',  text: 'text-indigo-700'  },
  pending:  { label: 'Pending',  bg: 'bg-amber-50',   text: 'text-amber-700'   },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  closed:   { label: 'Closed',   bg: 'bg-gray-100',   text: 'text-gray-500'    },
}

const SUGGESTED_PROMPTS = [
  'How do I connect Razorpay?',
  'How do I add a member?',
  'How do WhatsApp reminders work?',
  'How do I publish my website?',
]

// Pre-fill presets opened via /owner-dashboard/help?compose=<key>
// Keep these in sync with category slugs in support_categories.
const COMPOSE_PRESETS = {
  bug: {
    subject:  'Bug report: ',
    category: 'troubleshooting',
    priority: 'high',
    message:  E_BUG_TEMPLATE(),
  },
  'delete-account': {
    subject:  'Account deletion request',
    category: 'account',
    priority: 'urgent',
    message:  E_DELETE_TEMPLATE(),
  },
}

function E_BUG_TEMPLATE() {
  return [
    'What happened:',
    '',
    'What I expected:',
    '',
    'Steps to reproduce:',
    '1. ',
    '2. ',
    '3. ',
    '',
    'Browser / device: ',
  ].join('\n')
}

function E_DELETE_TEMPLATE() {
  return [
    'I would like to permanently delete my Gymmobius account and all gym data.',
    '',
    'Reason for leaving (optional): ',
    '',
    'I understand that:',
    '- All members, payments, attendance, and plans will be permanently deleted',
    '- Any active subscription will be cancelled',
    '- This action cannot be undone',
    '',
    'Please confirm via email before processing.',
  ].join('\n')
}

// ── helpers ──────────────────────────────────────────────────────────────────
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
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function scoreFaqs(query, faqs) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)
  if (!terms.length) return []

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
    if (question === q) score += 30   // exact match boost
    if (faq.is_pinned) score += 1     // tiebreaker for popular
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
  const parts = String(text).split(re)
  return parts.map((part, i) =>
    re.test(part)
      ? <mark key={i} className="bg-indigo-100 text-indigo-900 rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

function getCategoryIcon(iconName) {
  const Icon = LUCIDE_MAP[iconName] || HelpCircle
  return Icon
}

// ── skeleton ─────────────────────────────────────────────────────────────────
function SupportSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto space-y-8">
      <div className="text-center space-y-3">
        <Sk h={36} w={260} r={10} />
        <Sk h={14} w={360} />
        <div className="pt-4 max-w-xl mx-auto"><Sk h={52} r={16} /></div>
      </div>
      <Sk h={200} r={16} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <Sk key={i} h={120} r={16} />)}
      </div>
      <Sk h={300} r={16} />
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────
export default function SupportPage() {
  const { user, profile, gymId, gymName } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [categories, setCategories]   = useState([])
  const [popular,    setPopular]      = useState([])
  const [allFaqs,    setAllFaqs]      = useState(null)
  const [counts,     setCounts]       = useState({})
  const [tickets,    setTickets]      = useState([])
  const [loading,    setLoading]      = useState(true)

  const [search, setSearch] = useState('')
  const debouncedSearch     = useDebounce(search, 250)

  const [activeCategory,   setActiveCategory]   = useState(null)
  const [categoryFaqs,     setCategoryFaqs]     = useState([])
  const [drawerFaq,        setDrawerFaq]        = useState(null)
  const [ticketModalOpen,  setTicketModalOpen]  = useState(false)
  const [composePreset,    setComposePreset]    = useState(null)
  const [successBanner,    setSuccessBanner]    = useState(null)
  const [expandedTicket,   setExpandedTicket]   = useState(null)

  // Assistant
  const [assistantQuery,   setAssistantQuery]   = useState('')
  const [assistantResults, setAssistantResults] = useState(null)
  const [assistantLoading, setAssistantLoading] = useState(false)

  const searchInputRef = useRef(null)

  // ── deep-link compose mode: /owner-dashboard/help?compose=bug ──
  useEffect(() => {
    const key = searchParams.get('compose')
    if (key && COMPOSE_PRESETS[key]) {
      setComposePreset(COMPOSE_PRESETS[key])
      setTicketModalOpen(true)
      // Clean the URL so refresh/back doesn't re-trigger
      searchParams.delete('compose')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // ── initial load ──
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCategories(),
      fetchPopularFaqs(8),
      fetchFaqCategoryCounts(),
      user?.id ? fetchMyTickets(user.id) : Promise.resolve([]),
    ])
      .then(([cats, pop, cnts, tks]) => {
        if (cancelled) return
        setCategories(cats)
        setPopular(pop)
        setCounts(cnts)
        setTickets(tks)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  // ── lazy-load all FAQs once search/assistant activates ──
  async function ensureAllFaqs() {
    if (allFaqs) return allFaqs
    const data = await fetchAllFaqs()
    setAllFaqs(data)
    return data
  }

  // ── debounced live search ──
  const [liveSearchResults, setLiveSearchResults] = useState(null)
  useEffect(() => {
    if (!debouncedSearch.trim()) { setLiveSearchResults(null); return }
    let cancelled = false
    ensureAllFaqs().then(faqs => {
      if (cancelled) return
      setLiveSearchResults(scoreFaqs(debouncedSearch, faqs).slice(0, 12))
    })
    return () => { cancelled = true }
  }, [debouncedSearch])

  // ── category drill-down ──
  async function openCategory(cat) {
    setActiveCategory(cat)
    setSearch('')
    setLiveSearchResults(null)
    const faqs = await fetchFaqsByCategory(cat.id)
    setCategoryFaqs(faqs)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearView() {
    setActiveCategory(null)
    setCategoryFaqs([])
    setSearch('')
    setLiveSearchResults(null)
  }

  // ── assistant ──
  async function runAssistant(q) {
    const query = (q || assistantQuery).trim()
    if (!query) return
    setAssistantQuery(query)
    setAssistantLoading(true)
    try {
      const faqs = await ensureAllFaqs()
      const matches = scoreFaqs(query, faqs).slice(0, 3)
      setAssistantResults(matches)
    } finally {
      setAssistantLoading(false)
    }
  }

  function clearAssistant() {
    setAssistantQuery('')
    setAssistantResults(null)
  }

  // ── article drawer ──
  function openArticle(faq) {
    setDrawerFaq(faq)
    incrementFaqView(faq.id)
  }
  function closeArticle() { setDrawerFaq(null) }

  // ── ticket submission ──
  async function handleTicketSubmit(payload) {
    const ticket = await createTicket({
      gymId,
      userId: user.id,
      email: profile?.email || user?.email || '',
      ...payload,
    })
    setTickets(prev => [ticket, ...prev])
    setTicketModalOpen(false)
    setSuccessBanner({ id: ticket.id })
    setTimeout(() => setSuccessBanner(null), 8000)
  }

  async function handleReopen(ticketId) {
    const updated = await reopenTicket(ticketId)
    setTickets(prev => prev.map(t => t.id === ticketId ? updated : t))
  }

  // ── cooldown check ──
  const lastTicketAge = tickets[0]
    ? Math.floor((Date.now() - new Date(tickets[0].created_at).getTime()) / 1000)
    : Infinity
  const onCooldown = lastTicketAge < 60
  const cooldownRemaining = Math.max(0, 60 - lastTicketAge)

  const showSearchResults = !!debouncedSearch.trim()
  const showCategoryView  = !!activeCategory

  if (loading) return <SupportSkeleton />

  return (
    <div className="max-w-[1100px] mx-auto space-y-8 relative pb-4">

      {/* ── Success banner ── */}
      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-2 z-30 mx-auto max-w-md bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">Ticket #{successBanner.id.slice(0, 8)} created</p>
              <p className="text-xs text-emerald-700">Expected response: 1–2 business days</p>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Hero ══════════════════════════════════════════════════════════════ */}
      <div className="text-center pt-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Help & Support</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">Find answers, troubleshoot issues, and contact our team.</p>

        {/* Search */}
        <div className="mt-6 max-w-xl mx-auto relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCategory(null) }}
            placeholder="Search articles, questions, keywords…"
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick category chips */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {categories.slice(0, 4).map(c => (
            <button
              key={c.id}
              onClick={() => openCategory(c)}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ══ AI-style assistant ════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Gymmobius Assistant</p>
            <p className="text-[11px] text-gray-400">Ask anything — I'll find the right article for you.</p>
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); runAssistant() }}
          className="relative"
        >
          <textarea
            value={assistantQuery}
            onChange={e => setAssistantQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runAssistant() }
            }}
            placeholder="e.g. How do I connect Razorpay?"
            rows={2}
            className="w-full pl-4 pr-14 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 resize-none"
          />
          <button
            type="submit"
            disabled={!assistantQuery.trim() || assistantLoading}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Send"
          >
            {assistantLoading
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </form>

        {/* Suggested prompts */}
        {!assistantResults && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Try</span>
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => { setAssistantQuery(p); runAssistant(p) }}
                className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Result */}
        <AnimatePresence mode="wait">
          {assistantResults && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-4 border-t border-gray-100 pt-4"
            >
              {assistantResults.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-gray-700">Couldn't find a matching article.</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Try rephrasing, or create a support ticket and we'll help directly.</p>
                  <button
                    onClick={() => setTicketModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    <MessageCircle size={13} /> Create a ticket
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 cursor-pointer hover:bg-indigo-50 transition-colors"
                    onClick={() => openArticle(assistantResults[0])}
                  >
                    <p className="text-sm font-semibold text-gray-900 mb-1.5">{assistantResults[0].question}</p>
                    <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap leading-relaxed">{assistantResults[0].answer}</p>
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-indigo-700">
                      Read full article <ArrowRight size={12} />
                    </div>
                  </div>

                  {assistantResults.length > 1 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-2">Related</p>
                      <div className="flex flex-wrap gap-2">
                        {assistantResults.slice(1).map(f => (
                          <button
                            key={f.id}
                            onClick={() => openArticle(f)}
                            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            {f.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-indigo-100/50">
                    <span className="text-[11px] text-gray-400">Not helpful?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTicketModalOpen(true)}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                      >
                        Create a ticket →
                      </button>
                      <button
                        onClick={clearAssistant}
                        className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══ Main content area ════════════════════════════════════════════════ */}
      {showSearchResults || showCategoryView ? (
        <SearchResultsView
          query={debouncedSearch}
          category={activeCategory}
          results={showSearchResults ? (liveSearchResults || []) : categoryFaqs}
          onClear={clearView}
          onOpenArticle={openArticle}
          onCreateTicket={() => setTicketModalOpen(true)}
        />
      ) : (
        <>
          {/* Categories grid */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Browse by Category</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map(c => {
                const Icon = getCategoryIcon(c.icon)
                return (
                  <button
                    key={c.id}
                    onClick={() => openCategory(c)}
                    className="text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                      <Icon size={18} className="text-indigo-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{c.name}</p>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{c.description}</p>
                    <p className="text-[11px] font-medium text-indigo-600 mt-2">
                      {counts[c.id] || 0} {counts[c.id] === 1 ? 'article' : 'articles'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Popular questions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-indigo-600" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Popular Questions</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {popular.map(f => (
                <button
                  key={f.id}
                  onClick={() => openArticle(f)}
                  className="flex items-center gap-3 text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2">{f.question}</p>
                    {f.category && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
                        {f.category.name}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ Need help CTA ════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-2xl p-5 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <MessageCircle size={20} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900">Still need help?</h3>
              <p className="text-sm text-gray-500 mt-0.5 break-words">
                Our team responds within 1–2 business days. We'll send a reply to{' '}
                <span className="font-medium text-gray-700 break-all">{profile?.email || 'your account email'}</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTicketModalOpen(true)}
            className="w-full md:w-auto px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Create a support ticket
          </button>
        </div>
      </div>

      {/* ══ Recent tickets ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your Tickets</p>
          {tickets.length > 0 && (
            <span className="text-xs text-gray-400">{tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}</span>
          )}
        </div>
        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No tickets yet</p>
            <p className="text-xs text-gray-400 mt-1">Most questions are answered in the FAQ above.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
            {tickets.map(t => {
              const isOpen   = expandedTicket === t.id
              const badge    = STATUS_BADGE[t.status] || STATUS_BADGE.open
              const canReopen = t.status === 'resolved' || t.status === 'closed'
              return (
                <div key={t.id}>
                  <button
                    onClick={() => setExpandedTicket(isOpen ? null : t.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {t.category} · {fmtRelative(t.created_at)}
                        {t.updated_at !== t.created_at && ` · updated ${fmtRelative(t.updated_at)}`}
                      </p>
                    </div>
                    <ChevronDown size={16} className={`text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 bg-gray-50/40">
                          <div className="bg-white border border-gray-100 rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-400 mb-1.5">Message</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{t.message}</p>
                            {t.screenshot_url && (
                              <a href={t.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-indigo-700 hover:text-indigo-900">
                                <ImageIcon size={12} /> View screenshot
                              </a>
                            )}
                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
                              <div className="text-[11px] text-gray-400">
                                Ticket #{t.id.slice(0, 8)} · {t.priority} priority
                              </div>
                              {canReopen && (
                                <button
                                  onClick={() => handleReopen(t.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                                >
                                  <RefreshCw size={12} /> Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Article drawer ── */}
      <ArticleDrawer
        faq={drawerFaq}
        allFaqs={allFaqs}
        onClose={closeArticle}
        onOpenArticle={openArticle}
        onCreateTicket={() => setTicketModalOpen(true)}
        getCategoryIcon={getCategoryIcon}
      />

      {/* ── Ticket modal ── */}
      {ticketModalOpen && (
        <TicketModal
          categories={categories}
          allFaqs={allFaqs}
          ensureAllFaqs={ensureAllFaqs}
          profile={profile}
          gymName={gymName}
          gymId={gymId}
          preset={composePreset}
          onClose={() => { setTicketModalOpen(false); setComposePreset(null) }}
          onSubmit={handleTicketSubmit}
          onOpenArticle={openArticle}
          onCooldown={onCooldown}
          cooldownRemaining={cooldownRemaining}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SearchResultsView({ query, category, results, onClear, onOpenArticle, onCreateTicket }) {
  const heading = category
    ? `Articles in ${category.name}`
    : `${results.length} ${results.length === 1 ? 'result' : 'results'} for "${query}"`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-900">{heading}</p>
        <button
          onClick={onClear}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
        >
          <X size={12} /> Clear
        </button>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Search size={20} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700">No matches found</h3>
          <p className="text-xs text-gray-400 mt-1 mb-5">Try different keywords, browse categories, or create a ticket.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onClear}
              className="px-4 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:border-gray-300 cursor-pointer"
            >
              Browse categories
            </button>
            <button
              onClick={onCreateTicket}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Create a ticket
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden">
          {results.map(f => (
            <button
              key={f.id}
              onClick={() => onOpenArticle(f)}
              className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-gray-50/60 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                  {query ? highlightMatch(f.question, query) : f.question}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {query ? highlightMatch(f.answer.slice(0, 180), query) : f.answer.slice(0, 180)}…
                </p>
                {f.category && (
                  <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
                    {f.category.name}
                  </span>
                )}
              </div>
              <ChevronRight size={15} className="text-gray-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ArticleDrawer({ faq, allFaqs, onClose, onOpenArticle, onCreateTicket, getCategoryIcon }) {
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!faq) return
    setFeedback(null)
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [faq, onClose])

  const related = useMemo(() => {
    if (!faq || !allFaqs) return []
    return allFaqs
      .filter(f => f.id !== faq.id && f.category_id === faq.category_id)
      .slice(0, 3)
  }, [faq, allFaqs])

  return (
    <AnimatePresence>
      {faq && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.25 }}
            className="fixed top-0 right-0 z-40 h-full w-full sm:w-[560px] bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {faq.category && (() => {
                  const Icon = getCategoryIcon(faq.category.icon)
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                      <Icon size={11} /> {faq.category.name}
                    </span>
                  )
                })()}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 leading-snug">{faq.question}</h2>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap prose-sm">
                {renderMarkdownish(faq.answer)}
              </div>

              {/* Feedback */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-gray-500">Was this article helpful?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFeedback('up')}
                    disabled={feedback}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${
                      feedback === 'up'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    <ThumbsUp size={12} /> Yes
                  </button>
                  <button
                    onClick={() => setFeedback('down')}
                    disabled={feedback}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${
                      feedback === 'down'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-700'
                    }`}
                  >
                    <ThumbsDown size={12} /> No
                  </button>
                </div>
              </div>

              {feedback === 'down' && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800">
                    Sorry this didn't help. <button onClick={onCreateTicket} className="font-semibold underline cursor-pointer">Create a ticket</button> and we'll respond directly.
                  </p>
                </div>
              )}

              {/* Related */}
              {related.length > 0 && (
                <div className="mt-8">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Related Articles</p>
                  <div className="space-y-2">
                    {related.map(r => (
                      <button
                        key={r.id}
                        onClick={() => onOpenArticle(r)}
                        className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-white transition-colors text-left group cursor-pointer"
                      >
                        <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">{r.question}</span>
                        <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={onCreateTicket}
                className="w-full py-2.5 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:border-indigo-300 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle size={14} /> Still need help? Contact support
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* Very simple markdown-ish renderer for **bold** and `code` and bullet lines */
function renderMarkdownish(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />
    // bold + inline code
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[12px] font-mono">$1</code>')

    // numbered/bulleted lists
    const numMatch = /^(\d+)\.\s+(.+)/.exec(line)
    if (numMatch) {
      return (
        <div key={i} className="flex gap-2.5 py-1">
          <span className="text-xs font-bold text-indigo-600 mt-0.5 shrink-0">{numMatch[1]}.</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: numMatch[2]
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[12px] font-mono">$1</code>')
          }} />
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} className="flex gap-2.5 py-1">
          <span className="text-gray-400 mt-1 shrink-0">•</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: line.slice(2)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[12px] font-mono">$1</code>')
          }} />
        </div>
      )
    }
    return <p key={i} className="py-1" dangerouslySetInnerHTML={{ __html: html }} />
  })
}

// ─── Ticket modal ────────────────────────────────────────────────────────────
function TicketModal({
  categories, allFaqs, ensureAllFaqs, profile, gymName, gymId, preset,
  onClose, onSubmit, onOpenArticle, onCooldown, cooldownRemaining,
}) {
  const [subject, setSubject]       = useState(preset?.subject  || '')
  const [category, setCategory]     = useState(preset?.category || 'other')
  const [priority, setPriority]     = useState(preset?.priority || 'normal')
  const [message, setMessage]       = useState(preset?.message  || '')
  const [file, setFile]             = useState(null)
  const [preview, setPreview]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Pre-submit FAQ suggestion (debounced)
  const debouncedSubject = useDebounce(subject, 350)
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!debouncedSubject.trim() || debouncedSubject.length < 6) {
      setSuggestions([])
      return
    }
    let cancelled = false
    ensureAllFaqs().then(faqs => {
      if (cancelled) return
      setSuggestions(scoreFaqs(debouncedSubject, faqs).slice(0, 2))
    })
    return () => { cancelled = true }
  }, [debouncedSubject, ensureAllFaqs])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.')
      return
    }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearFile() {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (subject.trim().length < 4) return setError('Subject must be at least 4 characters.')
    if (message.trim().length < 20) return setError('Please describe your issue in at least 20 characters.')
    if (onCooldown) return

    setSubmitting(true)
    try {
      let screenshotUrl = null
      if (file) {
        screenshotUrl = await uploadTicketScreenshot(file, gymId)
      }
      await onSubmit({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
        screenshotUrl,
      })
    } catch (err) {
      setError(err.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormModal title="Contact Support" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Auto-fill hint */}
        <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
          <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
          <span>
            We'll attach your account info: <span className="font-semibold text-gray-700">{profile?.email || '—'}</span>
            {gymName && <> · <span className="font-semibold text-gray-700">{gymName}</span></>}
          </span>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of your issue"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* Pre-submit FAQ suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider mb-2">
              Found {suggestions.length} {suggestions.length === 1 ? 'article' : 'articles'} that might help
            </p>
            <div className="space-y-1.5">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenArticle(s)}
                  className="w-full text-left flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-white transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-medium text-gray-700 group-hover:text-indigo-700">{s.question}</span>
                  <ArrowRight size={11} className="text-indigo-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category + Priority */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              placeholder="Choose category"
              options={[
                ...categories.map(c => ({ value: c.slug, label: c.name })),
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 px-2 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    priority === p.value
                      ? `${p.color} border-transparent`
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Message * <span className="text-gray-400 font-normal">({message.length}/2000)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, 2000))}
            placeholder="Describe what happened, what you expected, and any steps to reproduce."
            rows={6}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Screenshot */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Screenshot (optional)</label>
          {preview ? (
            <div className="relative inline-block">
              <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={clearFile}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-600 flex items-center justify-center cursor-pointer shadow-sm"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors cursor-pointer">
              <Paperclip size={13} />
              <span>Click to upload a screenshot</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        {/* Cooldown */}
        {onCooldown && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle size={13} className="shrink-0" />
            You just submitted a ticket — please wait {cooldownRemaining}s before another.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || onCooldown}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
