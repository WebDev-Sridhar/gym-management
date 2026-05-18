import {
  CreditCard, Users, UserCheck, Globe, BarChart3, Sparkles,
  AlertTriangle, Crown,
} from 'lucide-react'

/**
 * Banner registry.
 *
 * Each banner is a self-contained card definition. Visibility is decided
 * by the `visible(ctx)` predicate — returning true means "render me".
 * Pages mount a <BannerSlot pageKey="..." context={...} /> which evaluates
 * the predicates and renders the highest-priority undismissed banner.
 *
 * Field reference:
 *   id              — stable string (used for dismiss persistence)
 *   pages           — which page slots this banner appears in
 *   priority        — higher wins when multiple are eligible at once
 *   variant         — 'setup' | 'warning' | 'success' | 'info' | 'upgrade'
 *   backgroundType  — 'gradient' | 'glass' | 'soft' (optional override)
 *   icon            — lucide-react component
 *   label/title/description/ctaLabel — display strings
 *   ctaPath         — string to navigate() on CTA click
 *   secondaryAction — { label, path }
 *   dismissible     — boolean; setup/critical banners are typically false
 *   visible         — (ctx) => boolean (ctx = { gym, stats, subscription, ... })
 */

export const BANNERS = [
  // ── Payment setup ────────────────────────────────────────────────────
  {
    id: 'setup_payments',
    pages: ['dashboard', 'payments', 'plans'],
    priority: 90,
    variant: 'setup',
    backgroundType: 'gradient',
    icon: CreditCard,
    label: 'Setup required',
    title: 'Connect Razorpay to start collecting online payments',
    description: 'Accept membership dues, send WhatsApp payment links, and track revenue directly from your dashboard.',
    ctaLabel: 'Connect Payments',
    ctaPath:  '/owner-dashboard/payment-settings',
    secondaryAction: { label: 'Learn more', path: '/owner-dashboard/help?compose=' },
    dismissible: false,
    visible: ({ gym }) => gym && gym.razorpay_enabled === false,
  },

  // ── Add trainers ─────────────────────────────────────────────────────
  {
    id: 'add_trainer',
    pages: ['dashboard', 'trainers'],
    priority: 70,
    variant: 'info',
    backgroundType: 'glass',
    icon: UserCheck,
    label: 'Get started',
    title: 'Add your first trainer',
    description: 'Give trainers access to attendance, schedules, and member tracking tools.',
    ctaLabel: 'Add Trainer',
    ctaPath:  '/owner-dashboard/trainers',
    dismissible: true,
    visible: ({ stats }) => stats && (stats.trainerCount ?? 0) === 0,
  },

  // ── Build member base ────────────────────────────────────────────────
  {
    id: 'add_members',
    pages: ['dashboard', 'members'],
    priority: 60,
    variant: 'info',
    backgroundType: 'glass',
    icon: Users,
    label: 'Build your base',
    title: 'Start building your member base',
    description: 'Add members manually or let prospects join through your gym website.',
    ctaLabel: 'Add Members',
    ctaPath:  '/owner-dashboard/members',
    dismissible: true,
    visible: ({ stats }) => stats && (stats.totalMembers ?? 0) < 5,
  },

  // ── Website publish ──────────────────────────────────────────────────
  {
    id: 'publish_website',
    pages: ['dashboard'],
    priority: 50,
    variant: 'setup',
    backgroundType: 'gradient',
    icon: Globe,
    label: 'Almost live',
    title: 'Your gym website is not live yet',
    description: 'Publish your site to start accepting new member sign-ups online.',
    ctaLabel: 'Publish Website',
    ctaPath:  '/owner-dashboard/website',
    dismissible: true,
    // No publish flag in DB yet — treat "website never opened" as not live.
    // Owner gets the banner until they dismiss it (1-time guidance).
    visible: ({ gym, subscription }) => {
      const plan = subscription?.plan_name
      const proPlus = plan === 'Pro' || plan === 'Enterprise'
      // Only relevant to Pro+ — Starter doesn't have a full builder.
      if (!proPlus) return false
      // Soft heuristic: if no hero customisations, treat as un-published
      return !gym?.hero_title && !gym?.description
    },
  },

  // ── Expiring memberships nudge ───────────────────────────────────────
  {
    id: 'expiring_soon',
    pages: ['dashboard', 'members'],
    priority: 80,
    variant: 'warning',
    backgroundType: 'soft',
    icon: AlertTriangle,
    label: 'Action needed',
    title: 'You have memberships expiring this week',
    description: 'Send renewal reminders before they lapse to maximise retention.',
    ctaLabel: 'View Members',
    ctaPath:  '/owner-dashboard/members?filter=expiring',
    dismissible: true,
    visible: ({ stats }) => stats && (stats.expiringSoon ?? 0) >= 3,
  },

  // ── Upgrade to Pro ───────────────────────────────────────────────────
  {
    id: 'upgrade_to_pro',
    pages: ['dashboard', 'analytics', 'website'],
    priority: 30,
    variant: 'upgrade',
    backgroundType: 'gradient',
    icon: Crown,
    label: 'Unlock more',
    title: 'Get advanced analytics, website builder & WhatsApp automation',
    description: 'Upgrade to Pro to access churn prediction, peak-hour heatmaps, and a fully customisable public site.',
    ctaLabel: 'Upgrade to Pro',
    ctaPath:  '/owner-dashboard/subscription',
    dismissible: true,
    visible: ({ subscription }) => (subscription?.plan_name || 'Starter') === 'Starter',
  },

  // ── Analytics education (informational) ──────────────────────────────
  {
    id: 'analytics_education',
    pages: ['analytics'],
    priority: 10,
    variant: 'info',
    backgroundType: 'glass',
    icon: BarChart3,
    label: 'Pro tip',
    title: 'Understand your gym performance better',
    description: 'Track revenue trends, retention rates, and member activity in real time. Tap any KPI for a 6-month sparkline.',
    ctaLabel: 'View Reports',
    ctaPath:  '/owner-dashboard/analytics',
    dismissible: true,
    visible: () => true,   // always eligible on analytics page (unless dismissed)
  },

  // ── First-time celebratory success (one-shot) ────────────────────────
  {
    id: 'welcome_active',
    pages: ['dashboard'],
    priority: 100,
    variant: 'success',
    backgroundType: 'soft',
    icon: Sparkles,
    label: 'Welcome',
    title: 'Your Gymmobius dashboard is live',
    description: 'Start by adding members and connecting payments. Most gyms complete setup in under 10 minutes.',
    ctaLabel: 'Open Help Center',
    ctaPath:  '/owner-dashboard/help',
    dismissible: true,
    visible: ({ stats, gym }) =>
      stats && (stats.totalMembers ?? 0) === 0 && !gym?.razorpay_enabled,
  },
]

/**
 * Returns up to `limit` highest-priority eligible banners for a page.
 * Dismissed and ineligible banners are filtered out. Priority sorts desc.
 */
export function pickBanners(pageKey, context, dismissedIds, limit = 1) {
  return BANNERS
    .filter(b => b.pages.includes(pageKey))
    .filter(b => !dismissedIds.includes(b.id))
    .filter(b => {
      try { return b.visible(context) }
      catch { return false }
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}

/** Backwards-compat single-banner pick. */
export function pickBanner(pageKey, context, dismissedIds) {
  return pickBanners(pageKey, context, dismissedIds, 1)[0] || null
}
