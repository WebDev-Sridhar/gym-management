import { ROUTES } from './constants/routes'

export const NAV_LINKS = [
  { label: 'Features', to: ROUTES.FEATURES },
  { label: 'Pricing', to: ROUTES.PRICING },
  { label: 'Testimonials', to: '/#testimonials' },
  { label: 'About', to: ROUTES.ABOUT },
]

export const PROBLEMS = [
  {
    iconKey: 'clipboard',
    title: 'Manual Tracking',
    description: 'Still using registers and spreadsheets? You\'re losing members and money every single day.',
  },
  {
    iconKey: 'wallet',
    title: 'Missed Payments',
    description: 'Chasing members for payments wastes hours. Expired memberships slip through the cracks.',
  },
  {
    iconKey: 'ghost',
    title: 'Member Drop-offs',
    description: 'Members stop showing up and you don\'t notice until they\'re gone for good.',
  },
  {
    iconKey: 'chartDown',
    title: 'No Insights',
    description: 'Without data, you\'re guessing. No visibility into revenue trends, retention, or growth.',
  },
]

export const SOLUTIONS = [
  {
    title: 'Automated Attendance',
    description: 'QR-based check-ins that take 2 seconds. No manual logs, no disputes, full history.',
  },
  {
    title: 'Smart Payment Tracking',
    description: 'Auto-reminders before expiry. Track every payment. Know who owes what, instantly.',
  },
  {
    title: 'Retention Intelligence',
    description: 'Spot ghost members before they quit. Automated nudges bring them back.',
  },
  {
    title: 'Real-Time Analytics',
    description: 'Revenue, attendance, growth — all in one dashboard. Make decisions with data, not gut feel.',
  },
]

export const FEATURES = [
  {
    iconKey: 'qrCode',
    title: 'QR attendance, no register',
    description: 'Members scan a QR at the front desk and check in under two seconds. Live attendance, daily footfall reports, and trainer assignments update automatically — no paper logs, no disputes.',
  },
  {
    iconKey: 'creditCard',
    title: 'Payments that collect themselves',
    description: 'Razorpay-powered payment links sent over WhatsApp at the right moment in the renewal cycle. Smart retries on failed payments, real-time reconciliation, and a clean ledger you can hand to your CA.',
  },
  {
    iconKey: 'chartBar',
    title: 'The numbers you actually need',
    description: 'Revenue trends, retention by cohort, ghost-member alerts, and trainer-level performance — in plain language. No spreadsheets, no exports, no guesswork about where the next quarter is heading.',
  },
  {
    iconKey: 'users',
    title: 'Trainer workflows that scale',
    description: 'Assign members, track workout and diet plans, log sessions, and review attendance — per trainer, per branch. Trainers get their own dashboard and mobile-friendly view; owners get visibility without micromanaging.',
  },
]

export const TESTIMONIALS = [
  {
    quote: 'We went from managing everything on paper to having a complete system in one week. Our collections improved by 40%.',
    name: 'Rajesh Kumar',
    role: 'Owner, FitZone Gym',
    initials: 'RK',
  },
  {
    quote: 'The QR attendance system alone saved us 2 hours daily. Members love how quick check-in is now.',
    name: 'Priya Sharma',
    role: 'Manager, Iron Paradise',
    initials: 'PS',
  },
  {
    quote: 'Ghost member detection is a game-changer. We re-engaged 30+ members who were about to leave.',
    name: 'Amit Patel',
    role: 'Owner, PowerHouse Fitness',
    initials: 'AP',
  },
  {
    quote: 'Finally a gym management tool that doesn\'t feel like it was built in 2005. Clean, fast, and actually useful.',
    name: 'Sneha Reddy',
    role: 'Owner, FlexFit Studio',
    initials: 'SR',
  },
  {
    quote: 'The analytics dashboard gives me clarity I never had before. I know exactly where my revenue comes from.',
    name: 'Vikram Singh',
    role: 'Owner, Beast Mode Gym',
    initials: 'VS',
  },
]

// V3 Task 8: rewritten per PRICING_REVIEW.md V2 §5 + §6 + §7 + §8.
// - Prices reflect the trust/cost reality calibration (₹599 → ₹799 etc.)
// - Member caps from §6 (150 / 750 / unlimited)
// - Trainer caps from §7 (2 / 10 / unlimited)
// - WhatsApp from §8 (500 / 3,000 / 15,000 per month)
// - GST line was removed 2026-06-03: not GST-registered yet, so displaying
//   "+ 18% GST" is a misrepresentation (Section 32 CGST Act). Add back as a
//   per-plan `gst` field once GSTIN is in place and the edge fn adds 18% on top.
// - `tier` field is the canonical DB plan_name (matches subscriptions.plan_name
//   CHECK constraint after 20260601 migration)
//
// This is the SOURCE OF TRUTH for marketing surfaces (landing pricing page +
// homepage embed). The owner-facing BillingPage / SubscriptionPage have their
// own const for the Razorpay flow — keep the numbers in sync manually until
// Phase 5 unifies them via a saas_plans DB table.
export const PRICING_PLANS = [
  {
    name: 'Starter',
    tier: 'starter',
    price: '₹799',
    period: '/month',
    description: 'For solo studios and neighborhood gyms running one location.',
    features: [
      'Up to 150 active members',
      '2 trainer accounts',
      '500 WhatsApp reminders / month',
      'Razorpay payment collection',
      'Complete multi-page website',
      'Email support · 1 business day',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '₹1,799',
    period: '/month',
    description: 'For growing gyms with trainers, multiple plan tiers, and members worth keeping.',
    features: [
      'Up to 750 active members',
      '10 trainer accounts',
      '3,000 WhatsApp reminders / month',
      'Ghost-detection + cohort retention analytics',
      'Multi-page website + custom subdomain',
      'SEO meta overrides',
      'Same-business-day support',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Premium',
    tier: 'premium',
    price: '₹4,999',
    period: '/month',
    description: 'For multi-branch chains and premium fitness brands.',
    features: [
      'Unlimited active members',
      'Unlimited trainer accounts',
      '15,000 WhatsApp / month',
      'Multi-branch operations + consolidated reporting',
      'Custom apex domain (yourbrand.com)',
      'API access for finance/CRM integration',
      '4-hour SLA · phone + WhatsApp support',
    ],
    cta: 'Talk to sales',
    highlighted: false,
  },
]
