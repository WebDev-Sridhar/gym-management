import { ROUTES } from '../constants/routes'

export const DEMO_CONTENT = {
  seo: {
    title: 'Book a demo',
    description: 'Walk through Gymmobius with our team — see how check-ins, payments, renewals, and trainer workflows fit your gym before you sign up.',
    canonical: ROUTES.DEMO,
    keywords: 'gym software demo, book gymmobius demo, gym management walkthrough',
  },
  hero: {
    title: 'See Gymmobius running your gym, before you run it.',
    subtitle: 'A 30-minute walkthrough with our team. We’ll set up a sandbox gym with your member list, plans, and payment flow — so you can see exactly how it would feel on day one. No slideware, no sales pressure.',
  },
  cta: {
    label: 'Book a 30-minute demo',
    to: ROUTES.CONTACT,
  },
}
