import { Crown, MessageCircle, AlertTriangle } from 'lucide-react'
import FormModal from './FormModal'
import { planDisplayName } from '../../lib/featureGates'

// V3 Task 6/7: shared modal shown when createMember / createTrainerInvite
// throws a quota_exceeded error. Designed to be presented on any page that
// adds members or trainers — context.quota selects the copy. Task 12 will
// supply the WhatsApp Business number via VITE_SUPPORT_WHATSAPP; until
// then the link falls back to a placeholder so dev builds don't crash.

const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP || ''

const QUOTA_COPY = {
  active_members: {
    label:      'member',
    pluralUnit: 'members',
    headline:   'Member limit reached',
    body:       (current, cap, plan) =>
      `Your ${planDisplayName(plan)} plan includes up to ${cap} active members. ` +
      `You currently have ${current}. Upgrade to add more.`,
  },
  active_trainers: {
    label:      'trainer',
    pluralUnit: 'trainers',
    headline:   'Trainer limit reached',
    body:       (current, cap, plan) =>
      `Your ${planDisplayName(plan)} plan includes up to ${cap} ${cap === 1 ? 'trainer' : 'trainers'} ` +
      `(including pending invites). You currently have ${current}. Upgrade to add more.`,
  },
  // V3 Task 14: WhatsApp dispatch was blocked by quota / plan / Solo Coach rule.
  whatsapp_quota_exhausted: {
    label:      'WhatsApp message',
    pluralUnit: 'WhatsApp messages',
    headline:   'WhatsApp quota reached',
    body:       (current, cap, plan) =>
      `You've used all ${cap} WhatsApp reminders this period on the ${planDisplayName(plan)} plan. ` +
      `Quota resets on the 1st of next month. Upgrade now to keep messaging without interruption.`,
  },
  whatsapp_disabled: {
    label:      'WhatsApp',
    pluralUnit: 'WhatsApp messages',
    headline:   'WhatsApp not on your plan',
    body:       (_current, _cap, plan) =>
      planDisplayName(plan) === 'Solo Coach'
        ? 'WhatsApp reminders are a trial benefit and aren\'t included in the free Solo Coach plan. ' +
          'Upgrade to Starter to send WhatsApp reminders to your members.'
        : `Your ${planDisplayName(plan)} plan doesn't include WhatsApp reminders.`,
  },
  solo_coach_one_per_invoice: {
    label:      'reminder',
    pluralUnit: 'reminders',
    headline:   'Reminder already sent',
    body:       (_current, _cap, plan) =>
      `Your ${planDisplayName(plan)} plan includes 1 reminder per invoice. ` +
      'Upgrade to Starter for unlimited reminders per invoice.',
  },
  // V3 P0: hard-stop on expired subscription. Distinct copy + Renew CTA
  // (vs Upgrade) so the owner understands this is a billing-state issue,
  // not a plan-tier limitation. The 'isRenewal' flag below switches the
  // primary button text from "See plans" to "Renew now".
  subscription_expired: {
    label:      'feature',
    pluralUnit: 'features',
    headline:   'Subscription expired',
    isRenewal:  true,
    body:       (_current, _cap, plan, ctx) => {
      const what = ctx?.blocked === 'active_trainers' ? 'invite trainers'
                 : ctx?.blocked === 'active_members'  ? 'add members'
                 : 'use this feature'
      return `Your ${planDisplayName(plan)} subscription has expired. ` +
             `Renew now to ${what} again. Existing data is preserved — nothing was deleted.`
    },
  },
}

function buildWhatsAppHref(quota, requiredPlan) {
  if (!SUPPORT_WHATSAPP) return null
  const digits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')
  const text = encodeURIComponent(
    `Hi! I run a gym on Gymmobius and hit the ${QUOTA_COPY[quota]?.label ?? 'plan'} limit. ` +
    `I'd like to upgrade to ${planDisplayName(requiredPlan)}.`
  )
  return `https://wa.me/${digits}?text=${text}`
}

export default function UpgradeRequiredModal({ context, onClose, onUpgrade }) {
  if (!context) return null
  // Accept either context.quota (member/trainer cap errors from
  // membershipService) or context.code (WhatsApp / expired-sub errors)
  // so a single modal renders all upgrade-prompting failures.
  const key = context.code ?? context.quota ?? 'active_members'
  const copy = QUOTA_COPY[key] ?? QUOTA_COPY.active_members
  const planForCopy = context.current_plan ?? context.plan ?? 'free'
  const waHref = buildWhatsAppHref(key, context.required_plan)
  // V3 P0: expired-sub uses Renew copy + red icon; other cases use the
  // standard amber Upgrade affordance.
  const isRenewal = !!copy.isRenewal
  const modalTitle = isRenewal ? 'Subscription expired' : 'Upgrade required'
  const ctaLabel   = isRenewal ? 'Renew now'            : 'See plans'

  return (
    <FormModal title={modalTitle} onClose={onClose}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isRenewal ? 'bg-red-50' : 'bg-amber-50'}`}>
          {isRenewal
            ? <AlertTriangle size={20} className="text-red-600" />
            : <Crown        size={20} className="text-amber-600" />}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-gray-900">{copy.headline}</h4>
          <p className="mt-1 text-sm text-gray-600">
            {copy.body(context.current ?? context.used, context.cap, planForCopy, context)}
          </p>
          {context.required_plan && !isRenewal && (
            <div className="mt-3 text-xs text-gray-500">
              Recommended plan: <span className="font-semibold text-gray-700">{planDisplayName(context.required_plan)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="button"
          onClick={onUpgrade}
          className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-lg cursor-pointer ${isRenewal ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {ctaLabel}
        </button>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50"
          >
            <MessageCircle size={16} /> WhatsApp us
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Not now
        </button>
      </div>
    </FormModal>
  )
}
