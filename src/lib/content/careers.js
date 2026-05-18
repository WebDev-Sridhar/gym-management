import { ROUTES } from '../constants/routes'

export const CAREERS_CONTENT = {
  seo: {
    title: 'Careers',
    description: 'Join Gymmobius. We’re a small, deliberate team building software that thousands of gym owners run their business on. Remote-friendly, India-based, and shipping every week.',
    canonical: ROUTES.CAREERS,
    keywords: 'gymmobius careers, gym tech jobs, saas careers india, remote react jobs, fitness tech jobs',
  },
  hero: {
    title: 'Build software gyms run their business on.',
    subtitle: 'We’re a small team — under 15 people — with disproportionate impact. If you want to ship features that go live in real gyms the week you build them, you’ll feel at home here.',
  },
  jobs: [
    {
      id: 'senior-frontend-engineer',
      role: 'Senior Frontend Engineer',
      location: 'Remote (India)',
    },
    {
      id: 'backend-engineer-supabase',
      role: 'Backend Engineer — Supabase / Postgres',
      location: 'Remote (India)',
    },
    {
      id: 'product-designer',
      role: 'Product Designer (Web + Mobile)',
      location: 'Remote (India)',
    },
    {
      id: 'customer-success-lead',
      role: 'Customer Success Lead',
      location: 'Bengaluru / Hybrid',
    },
    {
      id: 'gym-onboarding-specialist',
      role: 'Gym Onboarding Specialist',
      location: 'Remote (India)',
    },
  ],
  // Future: applications will be inserted into a `job_applications` Supabase
  // table (id, job_id, name, email, resume_url, cover_letter, created_at).
  applyTo: ROUTES.CONTACT,
}
