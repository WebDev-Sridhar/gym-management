import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useBranch } from '../../store/BranchContext'
import { updateUserProfile } from '../../services/userService'
import { fetchGymDetails, updateGymDetails, updateGymSlug, checkSlugAvailable, updateGymSubdomain, checkSubdomainAvailable } from '../../services/membershipService'
import { updateBranch } from '../../services/branchService'
import { slugify, validateSlug, validateSubdomain, getGymPublicUrl } from '../../lib/slug'
import { MAIN_DOMAIN } from '../../lib/host'
import { canAccess } from '../../lib/featureGates'
import { useDebounce } from '../../hooks/useDebounce'
import { supabase } from '../../services/supabaseClient'
import { Sk } from '../../components/ui/Skeleton'
import {
  User, Building2, ShieldCheck, CreditCard, Globe, BarChart2,
  Users, MessageSquare, ClipboardList, Zap, Copy, Check,
  ExternalLink, LogOut, Mail, Phone, MapPin, ChevronRight,
  Bell, HelpCircle, AlertTriangle, CheckCircle, Lock, Pencil, X,
  Palette, Sun, Moon, Monitor,
} from 'lucide-react'
import { useTheme } from '../../store/ThemeContext'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}
function daysUntil(iso) {
  if (!iso) return null
  return Math.ceil((new Date(iso) - new Date()) / 86400000)
}
function initials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ── small reusable pieces ─────────────────────────────────────────────────────
function CardHeader({ icon: Icon, title, onEdit, editing }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-indigo-600" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            editing
              ? 'border-gray-200 text-gray-500 hover:text-gray-700'
              : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          {editing ? <><X size={12} />Cancel</> : <><Pencil size={12} />Edit</>}
        </button>
      )}
    </div>
  )
}

function ReadRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
      <span className={`text-sm text-gray-800 text-right break-all ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}

function FieldLabel({ children }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>
}

function Input({ value, onChange, placeholder, type = 'text', icon: Icon }) {
  return (
    <div className="relative">
      {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full ${Icon ? 'pl-8' : 'pl-3'} pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500`}
      />
    </div>
  )
}

function SaveRow({ loading, onSave, msg }) {
  return (
    <div className="pt-4 flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={loading}
        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {loading ? 'Saving…' : 'Save changes'}
      </button>
      {msg.text && (
        <span className={`flex items-center gap-1.5 text-xs font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
          {msg.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
          {msg.text}
        </span>
      )}
    </div>
  )
}

function QuickCard({ Icon, label, to, color }) {
  const navigate = useNavigate()
  const bg = {
    indigo: 'bg-indigo-50 text-indigo-600', violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-600', rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group cursor-pointer w-full"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg[color]}`}>
        <Icon size={15} strokeWidth={1.9} />
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
      <ChevronRight size={13} className="ml-auto text-gray-300 group-hover:text-gray-400 shrink-0" />
    </button>
  )
}

function SettingsSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto">
      {/* profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-5 mb-6">
        <Sk h={64} w={64} r={14} />
        <div className="space-y-2 flex-1"><Sk h={20} w="40%" /><Sk h={13} w="30%" /><Sk h={18} w={120} r={20} /></div>
      </div>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Sk h={200} r={12} />
          <Sk h={260} r={12} />
          <Sk h={180} r={12} />
        </div>
        <div className="lg:col-span-3 space-y-5">
          <Sk h={180} r={12} />
          <Sk h={220} r={12} />
          <Sk h={160} r={12} />
          <Sk h={200} r={12} />
        </div>
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate    = useNavigate()
  const { user, profile, gymId, gymName, subscription, logout, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { selectedBranchId, isAllBranches, branches, reload: reloadBranches } = useBranch()

  // The "Gym Details" card shows org-level data when viewing "All branches",
  // otherwise it shows the active branch's contact details (name/city/address/
  // phone/email) — those columns exist on both `gyms` and `gym_branches`.
  // Public URLs (slug, subdomain, custom domain) stay org-level regardless.
  const activeBranch = !isAllBranches ? branches.find(b => b.id === selectedBranchId) : null
  const detailsSource = activeBranch || null   // null = use `gym` (org) state

  const [loading, setLoading]         = useState(true)
  const [gym, setGym]                 = useState(null)
  const [signingOut, setSigningOut]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSlugModal, setShowSlugModal] = useState(false)
  const [showSubdomainModal, setShowSubdomainModal] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSubUrl, setCopiedSubUrl] = useState(false)
  const [copiedCustomUrl, setCopiedCustomUrl] = useState(false)
  const [copiedGymId, setCopiedGymId] = useState(false)

  // ── personal info ──
  const [editProfile, setEditProfile] = useState(false)
  const [pName, setPName]             = useState('')
  const [pPhone, setPPhone]           = useState('')
  const [savingP, setSavingP]         = useState(false)
  const [pMsg, setPMsg]               = useState({ text: '', type: 'success' })

  // ── gym details ──
  const [editGym, setEditGym]         = useState(false)
  const [gName, setGName]             = useState('')
  const [gCity, setGCity]             = useState('')
  const [gPhone, setGPhone]           = useState('')
  const [gEmail, setGEmail]           = useState('')
  const [gAddress, setGAddress]       = useState('')
  const [savingG, setSavingG]         = useState(false)
  const [gMsg, setGMsg]               = useState({ text: '', type: 'success' })

  // ── security ──
  const [sendingReset, setSendingReset] = useState(false)
  const [resetMsg, setResetMsg]         = useState({ text: '', type: 'success' })

  useEffect(() => {
    if (!gymId) { setLoading(false); return }
    fetchGymDetails(gymId)
      .then(g => {
        setGym(g)
        setGName(g?.name || ''); setGCity(g?.city || '')
        setGPhone(g?.phone || ''); setGEmail(g?.email || '')
        setGAddress(g?.address || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [gymId])

  useEffect(() => {
    if (profile) { setPName(profile.name || ''); setPPhone(profile.phone || '') }
  }, [profile])

  // Re-sync the Gym Details form fields whenever the active source flips
  // (org ↔ branch). Editing is silently cancelled to avoid losing edits to
  // one entity by saving them onto another.
  useEffect(() => {
    const src = detailsSource || gym
    setGName(src?.name || ''); setGCity(src?.city || '')
    setGPhone(src?.phone || ''); setGEmail(src?.email || '')
    setGAddress(src?.address || '')
    setEditGym(false); setGMsg({ text: '', type: 'success' })
  }, [detailsSource, gym])

  function cancelProfile() {
    setPName(profile?.name || ''); setPPhone(profile?.phone || '')
    setEditProfile(false); setPMsg({ text: '', type: 'success' })
  }

  function cancelGym() {
    const src = detailsSource || gym
    setGName(src?.name || ''); setGCity(src?.city || '')
    setGPhone(src?.phone || ''); setGEmail(src?.email || '')
    setGAddress(src?.address || '')
    setEditGym(false); setGMsg({ text: '', type: 'success' })
  }

  async function saveProfile() {
    setSavingP(true); setPMsg({ text: '', type: 'success' })
    try {
      await updateUserProfile({ authId: user.id, name: pName.trim(), phone: pPhone.trim() })
      await refreshProfile()
      setPMsg({ text: 'Profile updated.', type: 'success' })
      setEditProfile(false)
    } catch (err) {
      setPMsg({ text: err.message || 'Failed to save.', type: 'error' })
    } finally {
      setSavingP(false)
      setTimeout(() => setPMsg({ text: '', type: 'success' }), 4000)
    }
  }

  async function saveGym() {
    setSavingG(true); setGMsg({ text: '', type: 'success' })
    try {
      const fields = {
        name:    gName.trim(),
        city:    gCity.trim(),
        phone:   gPhone.trim(),
        email:   gEmail.trim(),
        address: gAddress.trim(),
      }
      if (activeBranch) {
        // Branch-scoped save — updates gym_branches row, then refreshes the
        // shared branches list so other dashboard pages reflect the change.
        await updateBranch(activeBranch.id, fields)
        await reloadBranches()
        setGMsg({ text: 'Branch details saved.', type: 'success' })
      } else {
        const updated = await updateGymDetails({ gymId, ...fields })
        setGym(updated)
        await refreshProfile()
        setGMsg({ text: 'Gym details saved.', type: 'success' })
      }
      setEditGym(false)
    } catch (err) {
      setGMsg({ text: err.message || 'Failed to save.', type: 'error' })
    } finally {
      setSavingG(false)
      setTimeout(() => setGMsg({ text: '', type: 'success' }), 4000)
    }
  }

  async function sendReset() {
    const email = profile?.email || user?.email
    if (!email) return setResetMsg({ text: 'No email on file.', type: 'error' })
    setSendingReset(true); setResetMsg({ text: '', type: 'success' })
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setResetMsg({ text: `Reset link sent to ${email}`, type: 'success' })
    } catch (err) {
      setResetMsg({ text: err.message || 'Failed to send.', type: 'error' })
    } finally {
      setSendingReset(false)
      setTimeout(() => setResetMsg({ text: '', type: 'success' }), 6000)
    }
  }

  function copyGymId() {
    navigator.clipboard.writeText(gymId)
    setCopiedGymId(true)
    setTimeout(() => setCopiedGymId(false), 1500)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await logout()
    navigate('/login')
  }

  if (loading) return <SettingsSkeleton />

  const planName  = subscription?.plan_name || 'Starter'
  const expiresAt = subscription?.expires_at
  const daysLeft  = daysUntil(expiresAt)
  const isExpired = daysLeft !== null && daysLeft <= 0
  const email     = profile?.email || user?.email || '—'

  const PLAN_FEATURES = [
    { feature: 'Member management',    starter: true,  pro: true  },
    { feature: 'Payment tracking',     starter: true,  pro: true  },
    { feature: 'Analytics dashboard',  starter: true,  pro: true  },
    { feature: 'Website builder',      starter: false, pro: true  },
    { feature: 'Razorpay integration', starter: false, pro: true  },
    { feature: 'Custom domain',        starter: false, pro: true  },
  ]

  return (
    <div className="max-w-[1100px] mx-auto min-w-0 overflow-x-hidden">

      {/* ── Page title ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account & Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile, gym details, security and subscription</p>
      </div>

      {/* ── Profile header (full width) ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
            {initials(profile?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{profile?.name || 'Your Name'}</h1>
            <p className="text-sm text-gray-400 truncate">{email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                <ShieldCheck size={10} /> Owner
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isExpired ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Zap size={10} /> {planName} Plan
              </span>
              {gymName && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Building2 size={10} /> {gymName}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <LogOut size={14} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 min-w-0 space-y-5">

          {/* Subscription */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader icon={CreditCard} title="Subscription & Billing" />
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-xl font-bold text-gray-900">{planName}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                isExpired ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {isExpired ? 'Expired' : 'Active'}
              </span>
            </div>
            {expiresAt && (
              <p className="text-xs text-gray-500 mb-1">
                {isExpired ? 'Expired' : 'Renews'} {fmtDate(expiresAt)}
              </p>
            )}
            {!isExpired && daysLeft !== null && daysLeft <= 30 && (
              <p className="text-xs font-medium text-amber-600 mb-1">{daysLeft} days remaining</p>
            )}

            <div className="border-t border-gray-50 pt-4 mt-4 space-y-2 mb-5">
              {PLAN_FEATURES.map(({ feature, starter, pro }) => {
                const has = planName === 'Starter' ? starter : pro
                return (
                  <div key={feature} className={`flex items-center gap-2 text-xs ${has ? 'text-gray-600' : 'text-gray-300'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${has ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      {has
                        ? <Check size={8} className="text-emerald-600" strokeWidth={3} />
                        : <span className="text-[7px] text-gray-300 font-bold leading-none">—</span>
                      }
                    </div>
                    {feature}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => navigate('/owner-dashboard/subscription')}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {planName === 'Starter' ? 'Upgrade to Pro' : 'Manage Subscription'}
            </button>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Access</p>
            <div className="space-y-1.5">
              <QuickCard Icon={Users}         label="Members"         to="/owner-dashboard/members"       color="indigo"  />
              <QuickCard Icon={CreditCard}    label="Payments"        to="/owner-dashboard/payments"      color="emerald" />
              <QuickCard Icon={BarChart2}     label="Analytics"       to="/owner-dashboard/analytics"     color="violet"  />
              <QuickCard Icon={ClipboardList} label="Plans & Pricing" to="/owner-dashboard/plans"         color="amber"   />
              <QuickCard Icon={Globe}         label="Website Builder" to="/owner-dashboard/website"       color="sky"     />
              <QuickCard Icon={MessageSquare} label="Communication"   to="/owner-dashboard/communication" color="rose"    />
            </div>
          </div>

          {/* Support & Help */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader icon={HelpCircle} title="Support & Help" />

            {/* Gym ID */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-1.5">Gym ID <span className="text-gray-300">(share with support)</span></p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={gymId || ''}
                  readOnly
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-500 font-mono outline-none"
                />
                <button
                  onClick={copyGymId}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {copiedGymId ? <><Check size={11} className="text-green-500" />Copied</> : <><Copy size={11} />Copy</>}
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
              {[
                { icon: HelpCircle,    label: 'Help Center',     sub: 'Search FAQs & raise tickets',     to:   '/owner-dashboard/help' },
                { icon: Mail,          label: 'Email support',   sub: 'support@gymmobius.com',           href: 'mailto:support@gymmobius.com' },
                { icon: AlertTriangle, label: 'Report a bug',    sub: 'Tracked in your tickets',         to:   '/owner-dashboard/help?compose=bug' },
              ].map(({ icon: Icon, label, sub, href, to }) => {
                const inner = (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">{label}</p>
                      <p className="text-[11px] text-gray-400 truncate">{sub}</p>
                    </div>
                    <ExternalLink size={12} className="text-gray-300 group-hover:text-indigo-400 shrink-0 transition-colors" />
                  </>
                )
                return to ? (
                  <button
                    key={label}
                    onClick={() => navigate(to)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer text-left"
                  >
                    {inner}
                  </button>
                ) : (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    {inner}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Notifications (placeholder — coming soon) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-indigo-600" />
                <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
              </div>
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full uppercase tracking-wide">Coming soon</span>
            </div>
            <div className="space-y-4 opacity-40 pointer-events-none select-none">
              {[
                { label: 'Payment received alerts',    desc: 'Notify when a member payment is confirmed'  },
                { label: 'Member expiry reminders',    desc: 'Daily digest of members expiring in 7 days' },
                { label: 'New member alerts',          desc: 'Notify when a new member is added'          },
                { label: 'Weekly performance summary', desc: 'Weekly email with key gym metrics'          },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <div className="w-9 h-5 bg-gray-200 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>{/* end left col */}

        {/* ══ RIGHT COLUMN ═════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 min-w-0 space-y-5">

          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader
              icon={User}
              title="Personal Information"
              editing={editProfile}
              onEdit={editProfile ? cancelProfile : () => setEditProfile(true)}
            />

            {editProfile ? (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Full Name</FieldLabel>
                    <Input value={pName} onChange={e => setPName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <Input
                      icon={Phone}
                      value={pPhone}
                      onChange={e => setPPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      type="tel"
                    />
                  </div>
                  <div>
                    <FieldLabel>Email Address</FieldLabel>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        value={email}
                        readOnly
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 outline-none cursor-default"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Managed by your auth provider.</p>
                  </div>
                  <div>
                    <FieldLabel>Role</FieldLabel>
                    <input
                      value="Owner"
                      readOnly
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 outline-none cursor-default"
                    />
                  </div>
                </div>
                <SaveRow loading={savingP} onSave={saveProfile} msg={pMsg} />
              </>
            ) : (
              <div>
                <ReadRow label="Full Name"  value={profile?.name}  />
                <ReadRow label="Phone"      value={profile?.phone} />
                <ReadRow label="Email"      value={email}          />
                <ReadRow label="Role"       value="Owner"          />
              </div>
            )}

            {!editProfile && pMsg.text && (
              <span className={`flex items-center gap-1.5 text-xs font-medium mt-3 ${pMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {pMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {pMsg.text}
              </span>
            )}
          </div>

          {/* Gym / Branch Details — source flips with the branch switcher */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader
              icon={Building2}
              title={activeBranch ? `Branch Details · ${activeBranch.name}` : 'Gym Details'}
              editing={editGym}
              onEdit={editGym ? cancelGym : () => setEditGym(true)}
            />
            {activeBranch && (
              <p className="text-[11px] text-gray-500 -mt-3 mb-4">
                Editing the <span className="font-semibold text-gray-700">{activeBranch.name}</span> branch — switch to <span className="font-semibold text-gray-700">All branches</span> in the topbar to edit the organisation profile.
              </p>
            )}

            {editGym ? (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>{activeBranch ? 'Branch Name' : 'Gym Name'}</FieldLabel>
                    <Input value={gName} onChange={e => setGName(e.target.value)} placeholder={activeBranch ? 'e.g. Anna Nagar' : 'Your gym name'} />
                  </div>
                  <div>
                    <FieldLabel>City</FieldLabel>
                    <Input value={gCity} onChange={e => setGCity(e.target.value)} placeholder="City" />
                  </div>
                  <div>
                    <FieldLabel>Contact Phone</FieldLabel>
                    <Input
                      icon={Phone}
                      value={gPhone}
                      onChange={e => setGPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Gym contact number"
                      type="tel"
                    />
                  </div>
                  <div>
                    <FieldLabel>Contact Email</FieldLabel>
                    <Input
                      icon={Mail}
                      value={gEmail}
                      onChange={e => setGEmail(e.target.value)}
                      placeholder="contact@yourgym.com"
                      type="email"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Address</FieldLabel>
                    <div className="relative">
                      <MapPin size={13} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                      <textarea
                        value={gAddress}
                        onChange={e => setGAddress(e.target.value)}
                        placeholder="Full gym address"
                        rows={2}
                        className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex items-center gap-3 flex-wrap">
                  <SaveRow loading={savingG} onSave={saveGym} msg={gMsg} />
                  <button
                    onClick={() => navigate('/owner-dashboard/website')}
                    className="px-4 py-2 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-1.5 mt-4"
                  >
                    <Globe size={13} /> Full website profile
                  </button>
                </div>
              </>
            ) : (
              <div>
                <ReadRow label={activeBranch ? 'Branch Name' : 'Gym Name'} value={detailsSource?.name    ?? gym?.name}    />
                <ReadRow label="City"          value={detailsSource?.city    ?? gym?.city}    />
                <ReadRow label="Contact Phone" value={detailsSource?.phone   ?? gym?.phone}   />
                <ReadRow label="Contact Email" value={detailsSource?.email   ?? gym?.email}   />
                <ReadRow label="Address"       value={detailsSource?.address ?? gym?.address} />
              </div>
            )}

            {/* Public URLs — organisation-wide, always shown regardless of active branch */}
            {gym?.slug && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <p className="text-xs font-medium text-gray-500">Public URLs</p>

                {/* Row 1: Path-based — always shown */}
                <PublicUrlRow
                  url={getGymPublicUrl(gym.slug)}
                  badge={canAccess('custom_subdomain', subscription?.plan_name) && gym.subdomain ? null : 'Primary'}
                  copied={copiedUrl}
                  onCopy={() => {
                    navigator.clipboard.writeText(getGymPublicUrl(gym.slug))
                    setCopiedUrl(true)
                    setTimeout(() => setCopiedUrl(false), 1500)
                  }}
                  rightAction={
                    <button
                      type="button"
                      onClick={() => setShowSlugModal(true)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Pencil size={11} />Change
                    </button>
                  }
                />

                {/* Row 2: Subdomain (Pro+) */}
                {canAccess('custom_subdomain', subscription?.plan_name) ? (
                  gym.subdomain ? (
                    <PublicUrlRow
                      url={`https://${gym.subdomain}.${MAIN_DOMAIN}`}
                      badge="Primary"
                      copied={copiedSubUrl}
                      onCopy={() => {
                        navigator.clipboard.writeText(`https://${gym.subdomain}.${MAIN_DOMAIN}`)
                        setCopiedSubUrl(true)
                        setTimeout(() => setCopiedSubUrl(false), 1500)
                      }}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => setShowSubdomainModal(true)}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <Pencil size={11} />Change
                        </button>
                      }
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubdomainModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 rounded-xl text-left transition-colors cursor-pointer group"
                    >
                      <Globe size={15} className="text-indigo-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-indigo-900">Claim your subdomain</p>
                        <p className="text-[11px] text-indigo-700/80 mt-0.5">
                          Use <span className="font-mono">{gym.slug}.{MAIN_DOMAIN}</span> for cleaner branding.
                        </p>
                      </div>
                      <ChevronRight size={13} className="text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/owner-dashboard/subscription')}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 bg-gray-50 hover:bg-white hover:border-indigo-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <Globe size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">
                        Subdomain <span className="text-[10px] font-bold ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wide">Pro</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Get <span className="font-mono">{gym.slug}.{MAIN_DOMAIN}</span> on the Pro plan.
                      </p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
                  </button>
                )}

                {/* Row 3: Custom domain (Premium) */}
                {canAccess('custom_domain', subscription?.plan_name) ? (
                  gym.custom_domain && gym.domain_status === 'verified' ? (
                    <PublicUrlRow
                      url={`https://${gym.custom_domain}`}
                      badge="Primary"
                      copied={copiedCustomUrl}
                      onCopy={() => {
                        navigator.clipboard.writeText(`https://${gym.custom_domain}`)
                        setCopiedCustomUrl(true)
                        setTimeout(() => setCopiedCustomUrl(false), 1500)
                      }}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => navigate('/owner-dashboard/website')}
                          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700 cursor-pointer flex items-center gap-1.5"
                        >
                          <Pencil size={11} />Manage
                        </button>
                      }
                    />
                  ) : gym.custom_domain ? (
                    // Domain added but not verified yet → status pill row
                    <button
                      type="button"
                      onClick={() => navigate('/owner-dashboard/website')}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-amber-200 bg-amber-50/60 hover:bg-amber-50 rounded-xl text-left transition-colors cursor-pointer group"
                    >
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-900 truncate">{gym.custom_domain}</p>
                        <p className="text-[11px] text-amber-700/80 mt-0.5">
                          {gym.domain_status === 'failed' ? 'DNS misconfigured — open Website Builder to fix' : 'Waiting for DNS — open Website Builder to verify'}
                        </p>
                      </div>
                      <ChevronRight size={13} className="text-amber-400 group-hover:text-amber-600 shrink-0" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('/owner-dashboard/website')}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-violet-200 bg-violet-50/40 hover:bg-violet-50 rounded-xl text-left transition-colors cursor-pointer group"
                    >
                      <Globe size={15} className="text-violet-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-violet-900">Add your own domain</p>
                        <p className="text-[11px] text-violet-700/80 mt-0.5">
                          Use <span className="font-mono">yourgym.com</span> — auto SSL included.
                        </p>
                      </div>
                      <ChevronRight size={13} className="text-violet-400 group-hover:text-violet-600 shrink-0" />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/owner-dashboard/subscription')}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 bg-gray-50 hover:bg-white hover:border-violet-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <Globe size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700">
                        Custom domain <span className="text-[10px] font-bold ml-1 px-1.5 py-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded uppercase tracking-wide">Premium</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Use <span className="font-mono">yourgym.com</span> on the Premium plan.
                      </p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-violet-500 shrink-0" />
                  </button>
                )}

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Old URLs keep working after a rename — visitors are auto-redirected.
                </p>
              </div>
            )}

            {!editGym && gMsg.text && (
              <span className={`flex items-center gap-1.5 text-xs font-medium mt-3 ${gMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                {gMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                {gMsg.text}
              </span>
            )}
          </div>

          {/* Password & Security */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader icon={Lock} title="Password & Security" />
            <div className="divide-y divide-gray-50">

              {/* Change password */}
              <div className="pb-5">
                <p className="text-sm font-medium text-gray-800 mb-0.5">Change password</p>
                <p className="text-xs text-gray-400 mb-3">
                  A reset link will be sent to <span className="font-medium text-gray-600">{email}</span>.
                </p>
                <button
                  onClick={sendReset}
                  disabled={sendingReset}
                  className="px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingReset
                    ? <><span className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />Sending…</>
                    : <><Mail size={13} />Send reset link</>}
                </button>
                {resetMsg.text && (
                  <p className={`flex items-center gap-1.5 text-xs font-medium mt-2 ${resetMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {resetMsg.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {resetMsg.text}
                  </p>
                )}
              </div>

              {/* Auth method */}
              <div className="py-5">
                <p className="text-sm font-medium text-gray-800 mb-0.5">Authentication method</p>
                <p className="text-xs text-gray-400 mb-3">How you sign in to GymMobius</p>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg w-fit">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Mail size={9} className="text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Email & password</span>
                </div>
              </div>

              {/* Session */}
              <div className="pt-5">
                <p className="text-sm font-medium text-gray-800 mb-0.5">Active session</p>
                <p className="text-xs text-gray-400 mb-3">You are currently signed in on this device.</p>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-4 py-2 border border-red-200 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <LogOut size={13} />
                  {signingOut ? 'Signing out…' : 'Sign out of this session'}
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Palette size={15} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-gray-900">Appearance</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Pick how the dashboard looks. Your choice is remembered on this browser.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light', Icon: Sun,
                  preview: { bg: '#f1f5f9', card: '#ffffff', text: '#0f172a', border: '#e5e7eb' } },
                { value: 'dark',  label: 'Dark',  Icon: Moon,
                  preview: { bg: '#0a0b14', card: '#15161f', text: '#f4f4f8', border: 'rgba(255,255,255,0.08)' } },
                { value: 'system', label: 'System', Icon: Monitor, disabled: true,
                  preview: { bg: 'linear-gradient(135deg,#f1f5f9 50%,#0a0b14 50%)', card: 'linear-gradient(135deg,#fff 50%,#15161f 50%)', text: '#6366f1', border: 'rgba(99,102,241,0.3)' } },
              ].map(({ value, label, Icon, preview, disabled }) => {
                const isActive = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setTheme(value)}
                    title={disabled ? 'Coming soon' : `Use ${label.toLowerCase()} mode`}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/40'
                        : 'border-gray-200 hover:border-indigo-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Mini preview card */}
                    <div
                      className="w-full h-12 rounded-lg mb-2.5 relative overflow-hidden border"
                      style={{ background: preview.bg, borderColor: preview.border }}
                    >
                      <div
                        className="absolute left-1.5 right-1.5 bottom-1.5 h-5 rounded-md flex items-center px-2 gap-1"
                        style={{ background: preview.card, border: `1px solid ${preview.border}` }}
                      >
                        <div className="w-1 h-1 rounded-full" style={{ background: preview.text, opacity: 0.7 }} />
                        <div className="flex-1 h-1 rounded-full" style={{ background: preview.text, opacity: 0.18 }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon size={12} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className={`text-xs font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{label}</span>
                      {disabled && <span className="ml-auto text-[9px] font-bold text-amber-700 uppercase tracking-wide">Soon</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-red-500" />
              <h2 className="text-sm font-semibold text-red-700">Danger Zone</h2>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between gap-4 flex-wrap pb-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Sign out everywhere</p>
                  <p className="text-xs text-gray-400 mt-0.5">Signs you out and clears all cached data.</p>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="px-4 py-2 border border-red-200 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Delete account</p>
                  <p className="text-xs text-gray-400 mt-0.5">Permanently deletes your account and all gym data. This cannot be undone.</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 border border-red-200 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                >
                  Request deletion
                </button>
              </div>
            </div>
          </div>

        </div>{/* end right col */}
      </div>{/* end grid */}

      {showDeleteConfirm && (
        <DeleteAccountConfirm
          gymName={gymName}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            navigate('/owner-dashboard/help?compose=delete-account')
          }}
        />
      )}

      {showSlugModal && gym && (
        <ChangeUrlModal
          gymId={gymId}
          currentSlug={gym.slug}
          onClose={() => setShowSlugModal(false)}
          onSaved={(updated) => {
            setGym(updated)
            setShowSlugModal(false)
          }}
        />
      )}

      {showSubdomainModal && gym && (
        <SubdomainModal
          gymId={gymId}
          gymSlug={gym.slug}
          currentSubdomain={gym.subdomain}
          onClose={() => setShowSubdomainModal(false)}
          onSaved={(updated) => {
            setGym(updated)
            setShowSubdomainModal(false)
          }}
        />
      )}
    </div>
  )
}

// ── Delete account confirmation modal ────────────────────────────────────────
function DeleteAccountConfirm({ gymName, onClose, onConfirm }) {
  const [typed, setTyped] = useState('')
  const target = gymName || 'DELETE'
  const matches = typed.trim().toLowerCase() === target.toLowerCase()

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete account</h3>
              <p className="text-xs text-gray-500 mt-0.5">This action is permanent and cannot be undone.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">What will be deleted:</p>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {[
                'All member records, plans and payment history',
                'Attendance logs and check-in data',
                'Trainers, programs and workout templates',
                'Your gym website and public page',
                'Any active subscription will be cancelled',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-red-400 mt-1 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-900">Consider these alternatives first:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-amber-800">
              <li>• Let your subscription expire — your data stays safe and you can return anytime</li>
              <li>• Pause WhatsApp/automation features by switching to Starter plan</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              For your protection, account deletion is processed by our team within <span className="font-semibold">2–3 business days</span> after we confirm by email.
              Clicking <span className="font-semibold">"Continue"</span> opens a pre-filled support ticket.
            </p>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Type <span className="font-mono font-bold text-gray-900">{target}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={target}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-300 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 font-mono"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to request
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Change URL slug modal ───────────────────────────────────────────────────
function ChangeUrlModal({ gymId, currentSlug, onClose, onSaved }) {
  const [draft, setDraft]       = useState(currentSlug || '')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [available, setAvailable] = useState(null) // null | true | false
  const [checking, setChecking] = useState(false)

  // Normalise input as the user types (lowercase, hyphens)
  function onInput(value) {
    setError('')
    setAvailable(null)
    // Allow incremental typing but collapse spaces/uppercase live
    const normalised = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setDraft(normalised)
  }

  const debouncedDraft = useDebounce(draft, 350)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // Live availability check
  useEffect(() => {
    const trimmed = (debouncedDraft || '').trim()
    if (!trimmed || trimmed === currentSlug) {
      setAvailable(null)
      return
    }
    const validationErr = validateSlug(trimmed)
    if (validationErr) {
      setAvailable(false)
      return
    }
    let cancelled = false
    setChecking(true)
    checkSlugAvailable(trimmed)
      .then(ok => { if (!cancelled) setAvailable(ok) })
      .catch(() => { if (!cancelled) setAvailable(null) })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [debouncedDraft, currentSlug])

  async function handleSave() {
    setError('')
    const trimmed = draft.trim()
    if (trimmed === currentSlug) return onClose()

    const validationErr = validateSlug(trimmed)
    if (validationErr) return setError(validationErr)
    if (available === false) return setError('That URL is already taken.')

    setSaving(true)
    try {
      const updated = await updateGymSlug({ gymId, currentSlug, newSlug: trimmed })
      onSaved(updated)
    } catch (err) {
      setError(err.message || 'Failed to update URL')
    } finally {
      setSaving(false)
    }
  }

  const trimmed     = draft.trim()
  const unchanged   = trimmed === currentSlug
  const showAvail   = trimmed && !unchanged && !validateSlug(trimmed)
  const canSave     = !saving && !unchanged && available === true

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Change public URL</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your old URL will keep working — visitors are redirected.</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">New URL slug</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono select-none pointer-events-none">
                {typeof window !== 'undefined' ? window.location.host : 'gymmobius.app'}/
              </span>
              <input
                value={draft}
                onChange={e => onInput(e.target.value)}
                placeholder="iron-paradise-mumbai"
                style={{ paddingLeft: `${(typeof window !== 'undefined' ? window.location.host.length : 14) * 7 + 18}px` }}
                className="w-full pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                autoFocus
              />
              {showAvail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking
                    ? <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin block" />
                    : available === true  ? <Check size={14} className="text-emerald-600" />
                    : available === false ? <X size={14} className="text-red-500" />
                    : null
                  }
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              Lowercase letters, numbers and hyphens. {trimmed.length}/40 characters.
            </p>
          </div>

          {/* Suggestion chip if input matches generated default */}
          {!trimmed && gymId && (
            <button
              type="button"
              onClick={() => setDraft(slugify(currentSlug || ''))}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              ↺ Reset to {currentSlug}
            </button>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          {unchanged && trimmed && (
            <p className="text-[11px] text-gray-400">This is your current URL.</p>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong>Heads up:</strong> updates to printed posters, ads, or hard-coded links pointing to the old URL won't be auto-redirected by search engines for a few days. The in-app redirect works immediately.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save new URL'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Public URL row — compact list item used in the Settings URL stack ───────
function PublicUrlRow({ url, badge, copied, onCopy, rightAction }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      <Globe size={14} className="text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-gray-800 truncate" title={url}>{url}</p>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wide shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onCopy}
          className="px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-medium text-gray-600 hover:border-gray-300 cursor-pointer flex items-center gap-1.5"
        >
          {copied ? <><Check size={12} className="text-green-500" />Copied</> : <><Copy size={12} />Copy</>}
        </button>
        {rightAction}
      </div>
    </div>
  )
}

// ── Subdomain claim/change modal ────────────────────────────────────────────
// Mirrors ChangeUrlModal: live availability check, validation, reserved
// hostname check, save → updateGymSubdomain (writes redirect entry on rename).
function SubdomainModal({ gymId, gymSlug, currentSubdomain, onClose, onSaved }) {
  // Default the input to gym.slug for first-time claim — most owners want
  // their subdomain to match their slug for consistency.
  const initial = currentSubdomain || gymSlug || ''
  const [draft, setDraft]       = useState(initial)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [available, setAvailable] = useState(null)
  const [checking, setChecking] = useState(false)

  function onInput(value) {
    setError('')
    setAvailable(null)
    const normalised = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setDraft(normalised)
  }

  const debouncedDraft = useDebounce(draft, 350)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  useEffect(() => {
    const trimmed = (debouncedDraft || '').trim()
    if (!trimmed || trimmed === currentSubdomain) {
      setAvailable(null)
      return
    }
    if (validateSubdomain(trimmed)) {
      setAvailable(false)
      return
    }
    let cancelled = false
    setChecking(true)
    checkSubdomainAvailable(trimmed)
      .then(ok => { if (!cancelled) setAvailable(ok) })
      .catch(() => { if (!cancelled) setAvailable(null) })
      .finally(() => { if (!cancelled) setChecking(false) })
    return () => { cancelled = true }
  }, [debouncedDraft, currentSubdomain])

  async function handleSave() {
    setError('')
    const trimmed = draft.trim()

    // Allow saving empty to "release" the subdomain (only if currently set)
    if (!trimmed && currentSubdomain) {
      setSaving(true)
      try {
        const updated = await updateGymSubdomain({ gymId, currentSubdomain, newSubdomain: null })
        onSaved(updated)
      } catch (err) {
        setError(err.message || 'Failed to release subdomain')
      } finally {
        setSaving(false)
      }
      return
    }

    if (trimmed === currentSubdomain) return onClose()

    const validationErr = validateSubdomain(trimmed)
    if (validationErr) return setError(validationErr)
    if (available === false) return setError('That subdomain is already taken.')

    setSaving(true)
    try {
      const updated = await updateGymSubdomain({ gymId, currentSubdomain, newSubdomain: trimmed })
      onSaved(updated)
    } catch (err) {
      setError(err.message || 'Failed to update subdomain')
    } finally {
      setSaving(false)
    }
  }

  const trimmed   = draft.trim()
  const unchanged = trimmed === (currentSubdomain || '')
  const showAvail = trimmed && !unchanged && !validateSubdomain(trimmed)
  const canSave   = !saving && !unchanged && (available === true || (!trimmed && currentSubdomain))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {currentSubdomain ? 'Change subdomain' : 'Claim your subdomain'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Your gym becomes reachable at a clean branded URL. Old URLs keep working.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Subdomain</label>
            <div className="flex items-center border border-gray-200 rounded-lg focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden">
              <input
                value={draft}
                onChange={e => onInput(e.target.value)}
                placeholder="iron-paradise"
                className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none font-mono"
                autoFocus
              />
              <span className="text-xs text-gray-400 font-mono select-none pr-3 shrink-0">
                .{MAIN_DOMAIN}
              </span>
              {showAvail && (
                <span className="pr-3 shrink-0">
                  {checking
                    ? <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin block" />
                    : available === true  ? <Check size={14} className="text-emerald-600" />
                    : available === false ? <X size={14} className="text-red-500" />
                    : null
                  }
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              Lowercase letters, numbers and hyphens. {trimmed.length}/30 characters.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          {unchanged && trimmed && (
            <p className="text-[11px] text-gray-400">This is your current subdomain.</p>
          )}

          {currentSubdomain && !trimmed && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Release subdomain?</strong> Your gym will only be reachable at the path-based URL until you claim a new subdomain.
              </p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
            <p className="text-[11px] text-gray-600 leading-relaxed">
              After save, <span className="font-mono">gymmobius.app/{gymSlug}</span> will redirect to your new subdomain. Existing posters / shared links keep working.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving…' : (currentSubdomain && !trimmed ? 'Release' : 'Save subdomain')}
          </button>
        </div>
      </div>
    </div>
  )
}
