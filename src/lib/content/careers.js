import { ROUTES } from '../constants/routes'

export const CAREERS_CONTENT = {
  seo: {
    title: 'Careers',
    description: 'Join Gymmobius. We’re a small, deliberate team building gym-management software for Indian gym owners. Remote-friendly, India-based.',
    canonical: ROUTES.CAREERS,
    keywords: 'gymmobius careers, gym tech jobs, saas careers india, remote react jobs, fitness tech jobs',
  },
  hero: {
    title: 'Build software gyms run their business on.',
    subtitle: 'We’re a small team — under 15 people. We’re early, which means your work ships to real gym owners almost as soon as you build it, and you’ll have real influence over what we build next.',
  },
  // No openings as of 2026-06-07. The 5 placeholder roles that used to live
  // here (Senior Frontend, Backend, Designer, Customer Success Lead, Onboarding
  // Specialist) were never real — removed to avoid attracting applicants
  // who'd feel misled when they hear back "not hiring right now".
  //
  // When we DO open a role: add an entry here as { id, role, location } and
  // the careers page will render it with the same apply flow. The talent-pool
  // form at the bottom keeps capturing general interest in the meantime.
  jobs: [],
  noOpeningsCopy: {
    headline:    'We’re not actively hiring right now',
    description: 'But we’re always interested in great people who care about gyms, fitness, and small business software. Drop us your details and we’ll reach out when something opens up.',
  },
  talentPool: {
    formHeading: 'Stay in touch',
    namePlaceholder:    'Your name',
    emailPlaceholder:   'Email address',
    phonePlaceholder:   'Phone (optional)',
    messagePlaceholder: 'Tell us about yourself — what kind of role excites you, what you’ve built, any links we should check out.',
    submitLabel:        'Add me to the pool',
    submittingLabel:    'Submitting…',
    successMessage:     "You’re in the pool — we’ll reach out when something opens up that fits.",
    errorMessage:       'Something went wrong. Please try again or email us directly.',
  },
}
