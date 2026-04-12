export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'About', href: '#about' },
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
    title: 'QR Attendance',
    description: 'Members scan, check-in logs auto-populate. Real-time attendance tracking with zero effort.',
  },
  {
    iconKey: 'creditCard',
    title: 'Payment Automation',
    description: 'Auto-generate payment links, send reminders via WhatsApp, track every transaction.',
  },
  {
    iconKey: 'chartBar',
    title: 'Analytics Dashboard',
    description: 'Revenue trends, member growth, retention rates — everything you need to scale your gym.',
  },
  {
    iconKey: 'users',
    title: 'Trainer Management',
    description: 'Assign members to trainers, track workout plans, manage schedules — all in one place.',
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
    description: 'Perfect for small gyms just getting started.',
    features: [
      'Up to 100 members',
      'QR attendance',
      'Basic analytics',
      'Payment tracking',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '₹2,499',
    period: '/month',
    description: 'For growing gyms that need full control.',
    features: [
      'Up to 500 members',
      'Everything in Starter',
      'WhatsApp automation',
      'Trainer management',
      'Ghost detection',
      'Advanced analytics',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '₹4,999',
    period: '/month',
    description: 'For gym chains and premium facilities.',
    features: [
      'Unlimited members',
      'Everything in Pro',
      'Multi-branch support',
      'Custom branding',
      'Custom domain',
      'API access',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]
