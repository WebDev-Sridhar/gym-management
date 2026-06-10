import { useNavigate } from 'react-router-dom'
import { Send, CheckCircle2, AlertTriangle, ArrowUpRight, MessageCircle } from 'lucide-react'

/**
 * Automation Intelligence — proves Gymmobius is working *for* the owner:
 * how many reminders/messages went out on their behalf this month and how
 * many landed. WhatsApp headroom is folded in here (not a separate quota
 * panel), in plain language, and the upgrade nudge only appears when the
 * owner is actually close to running out — see the product note in the
 * dashboard redesign. No members/trainers meters anywhere.
 */
const NEXT_PLAN = { free: 'Starter', starter: 'Pro', pro: 'Premium', premium: null }
const NUDGE_AT = 0.8

export default function AutomationIntelligence({ automation, quota }) {
  const navigate = useNavigate()
  if (!automation) return null

  const { sent, whatsapp, email, failed, deliveryRate } = automation
  const nothingYet = sent === 0 && failed === 0

  // Delivery health colour.
  const dChip =
    deliveryRate == null ? null
    : deliveryRate >= 90 ? { cls: 'text-green-600', Icon: CheckCircle2 }
    : deliveryRate >= 70 ? { cls: 'text-amber-600', Icon: CheckCircle2 }
    : { cls: 'text-red-600', Icon: AlertTriangle }

  // WhatsApp headroom — only surfaced when it's actually relevant to the owner.
  const cap = quota?.cap ?? 0
  const used = quota?.used ?? 0
  const pct = cap > 0 ? used / cap : 0
  const nearLimit = quota && !quota.isExpired && quota.whatsappEnabled && Number.isFinite(cap) && cap > 0 && pct >= NUDGE_AT
  const whatsappOff = quota && !quota.isExpired && !quota.whatsappEnabled
  const next = NEXT_PLAN[quota?.planName] ?? null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Automation this month</h2>
        <span className="text-xs text-gray-400">Gymmobius working for you</span>
      </div>

      {nothingYet ? (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Send size={18} className="text-indigo-600" strokeWidth={1.9} />
          </div>
          <p className="text-sm text-gray-500">
            No reminders sent yet this month. They go out automatically before memberships
            expire — and to members who stop showing up.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{sent}</p>
                <p className="text-xs text-gray-400 mt-0.5">messages sent for you</p>
              </div>
              {dChip && (
                <div>
                  <p className={`text-3xl font-bold tracking-tight ${dChip.cls}`}>{deliveryRate}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">delivered</p>
                </div>
              )}
            </div>
            {dChip && <dChip.Icon size={22} className={`${dChip.cls} shrink-0`} strokeWidth={1.9} />}
          </div>

          {/* Channel split */}
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <MessageCircle size={13} className="text-green-600" strokeWidth={2} />
              WhatsApp <span className="font-semibold text-gray-900">{whatsapp}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <Send size={13} className="text-blue-600" strokeWidth={2} />
              Email <span className="font-semibold text-gray-900">{email}</span>
            </span>
            {failed > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-600">
                <AlertTriangle size={13} strokeWidth={2} />
                {failed} failed
              </span>
            )}
          </div>
        </>
      )}

      {/* WhatsApp headroom — plain language, only when it matters */}
      {nearLimit && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3.5">
          <p className="text-xs text-amber-800 leading-relaxed">
            You've used <span className="font-semibold">{used}</span> of your{' '}
            <span className="font-semibold">{cap}</span> WhatsApp reminders this month. After that,
            reminders keep going — just by email instead.
            {next && ' Upgrade for a bigger WhatsApp allowance.'}
          </p>
          {next && (
            <button
              onClick={() => navigate('/owner-dashboard/subscription')}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 cursor-pointer"
            >
              Upgrade to {next} <ArrowUpRight size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {whatsappOff && (
        <div className="mt-4 rounded-lg bg-indigo-50/60 border border-indigo-100 p-3.5">
          <p className="text-xs text-gray-600 leading-relaxed">
            Your reminders go out by email on your current plan. Upgrade to Starter to send them
            over WhatsApp, where members actually read them.
          </p>
          <button
            onClick={() => navigate('/owner-dashboard/subscription')}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            See plans <ArrowUpRight size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
