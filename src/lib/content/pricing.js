import { ROUTES } from '../constants/routes'
import { PRICING_PLANS } from '../constants'

// PRICING_PLANS is re-exported under the structured content schema. The
// underlying data still lives in /lib/constants.js so the landing-page
// Pricing section continues to use the same source of truth.
export const PRICING_CONTENT = {
  seo: {
    title: 'Pricing',
    description: 'Transparent monthly pricing for gyms of every size. Starter for solo studios, Pro for growing gyms, Enterprise for multi-branch chains. No setup fees, cancel anytime.',
    canonical: ROUTES.PRICING,
    keywords: 'gym software pricing, gymmobius plans, gym management cost, gym saas pricing india',
  },
  hero: {
    title: 'Pricing that scales with your members, not against them.',
    subtitle: 'One subscription covers your dashboard, member app, trainer accounts, automated reminders, and unlimited check-ins. Pay monthly, cancel anytime.',
  },
  plans: PRICING_PLANS.map((plan) => ({
    ...plan,
    ctaTo: plan.cta === 'Talk to sales' || plan.cta === 'Contact Sales' ? ROUTES.CONTACT : ROUTES.AUTH.SIGNUP,
  })),
}
