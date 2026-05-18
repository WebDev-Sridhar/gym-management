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

export const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    description: 'For solo studios and gyms with one location. Everything you need to replace your register and start collecting payments online.',
    features: [
      'Up to 100 active members',
      'Unlimited QR attendance check-ins',
      'Razorpay payment collection',
      'Member mobile app (iOS + Android)',
      'Basic revenue and attendance reports',
      'Email support · replies within 1 business day',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₹2,499',
    period: '/month',
    description: 'For growing gyms with trainers, multiple plan tiers, and members worth keeping. Adds the automation that pays for itself.',
    features: [
      'Up to 500 active members',
      'Everything in Starter',
      'WhatsApp automation (renewals, reminders, birthdays)',
      'Trainer accounts with assigned-member workflows',
      'Ghost-member detection and re-engagement alerts',
      'Cohort retention and trainer-performance analytics',
      'Priority support · replies within 4 hours',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/month',
    description: 'For multi-branch chains and premium fitness brands that need custom domains, dedicated onboarding, and an account manager on call.',
    features: [
      'Unlimited active members',
      'Everything in Pro',
      'Multi-branch dashboards with consolidated reporting',
      'Custom branding and custom domain for your member portal',
      'API access for finance/CRM integration',
      'Dedicated onboarding and a named account manager',
      'Same-business-day SLA · phone + WhatsApp support',
    ],
    cta: 'Talk to sales',
    highlighted: false,
  },
]
