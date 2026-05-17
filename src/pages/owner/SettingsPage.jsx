import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { updateUserProfile } from '../../services/userService'
import { fetchGymDetails, updateGymDetails } from '../../services/membershipService'
import { supabase } from '../../services/supabaseClient'
import { Sk } from '../../components/ui/Skeleton'
import {
  User, Building2, ShieldCheck, CreditCard, Globe, BarChart2,
  Users, MessageSquare, ClipboardList, Zap, Copy, Check,
  ExternalLink, LogOut, Mail, Phone, MapPin, ChevronRight,
  Bell, HelpCircle, AlertTriangle, CheckCircle, Lock, Pencil, X,
} from 'lucide-react'

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

  const [loading, setLoading]         = useState(true)
  const [gym, setGym]                 = useState(null)
  const [signingOut, setSigningOut]   = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  function cancelProfile() {
    setPName(profile?.name || ''); setPPhone(profile?.phone || '')
    setEditProfile(false); setPMsg({ text: '', type: 'success' })
  }

  function cancelGym() {
    setGName(gym?.name || ''); setGCity(gym?.city || '')
    setGPhone(gym?.phone || ''); setGEmail(gym?.email || '')
    setGAddress(gym?.address || '')
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
      const updated = await updateGymDetails({
        gymId, name: gName.trim(), city: gCity.trim(),
        phone: gPhone.trim(), email: gEmail.trim(), address: gAddress.trim(),
      })
      setGym(updated)
      await refreshProfile()
      setGMsg({ text: 'Gym details saved.', type: 'success' })
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
    <div className="max-w-[1100px] mx-auto">

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
        <div className="lg:col-span-2 space-y-5">

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

        </div>{/* end left col */}

        {/* ══ RIGHT COLUMN ═════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-5">

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

          {/* Gym Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <CardHeader
              icon={Building2}
              title="Gym Details"
              editing={editGym}
              onEdit={editGym ? cancelGym : () => setEditGym(true)}
            />

            {editGym ? (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Gym Name</FieldLabel>
                    <Input value={gName} onChange={e => setGName(e.target.value)} placeholder="Your gym name" />
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
                <ReadRow label="Gym Name"       value={gym?.name}    />
                <ReadRow label="City"           value={gym?.city}    />
                <ReadRow label="Contact Phone"  value={gym?.phone}   />
                <ReadRow label="Contact Email"  value={gym?.email}   />
                <ReadRow label="Address"        value={gym?.address} />
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

          {/* Notifications */}
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
