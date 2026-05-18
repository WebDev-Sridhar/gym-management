import { ROUTES } from '../constants/routes'

export const BLOG_CONTENT = {
  seo: {
    title: 'Blog',
    description: 'Operational playbooks for gym owners — retention, pricing, automation, trainer management, and the math behind a profitable gym.',
    canonical: ROUTES.BLOG,
    keywords: 'gym blog, gym retention, member churn, gym pricing strategy, gym automation, gym business growth',
  },
  hero: {
    title: 'The Operator’s Notebook',
    subtitle: 'Field-tested ideas for running a profitable, modern gym. No fluff, no listicles — just operational playbooks from owners who do this every day.',
  },
  posts: [
    {
      slug: 'reduce-member-churn-first-90-days',
      title: 'The First 90 Days: Why Most Members Quit (And How to Stop It)',
      excerpt: 'Churn data from 200+ gyms shows the same pattern — most members who quit do so within 90 days of joining. Here’s the onboarding system that fixes it.',
    },
    {
      slug: 'pricing-tiers-that-actually-work',
      title: 'Pricing Tiers That Actually Work for Indian Gyms',
      excerpt: 'Three-tier pricing, family memberships, and corporate plans — what converts, what doesn’t, and the rate cards we’ve seen drive 30%+ revenue lift.',
    },
    {
      slug: 'whatsapp-automation-for-gyms',
      title: 'WhatsApp Automation Without Sounding Like a Bot',
      excerpt: 'Reminders, renewals, birthday wishes — how to automate member communication on WhatsApp while keeping it personal enough that members actually reply.',
    },
    {
      slug: 'ghost-members-detection-playbook',
      title: 'How to Spot a Ghost Member Before They Cancel',
      excerpt: 'A member who hasn’t checked in for 14 days is 4x more likely to cancel. Here’s the early-warning system we built into Gymmobius — and how to run it manually if you don’t use us yet.',
    },
    {
      slug: 'trainer-comp-models',
      title: 'Trainer Compensation: Salary, Commission, or Hybrid?',
      excerpt: 'A breakdown of the three trainer-pay models we see across the platform, the math behind each, and which one tends to retain the strongest trainers long-term.',
    },
    {
      slug: 'gym-website-conversion',
      title: 'Why Your Gym Website Isn’t Converting (And the 5 Fixes That Help)',
      excerpt: 'Most gym websites are brochures. Modern members compare 3+ gyms online before walking in. Here’s what to put above the fold to win the visit.',
    },
  ],
}
