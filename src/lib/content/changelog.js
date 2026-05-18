import { ROUTES } from '../constants/routes'

export const CHANGELOG_CONTENT = {
  seo: {
    title: 'Changelog',
    description: 'Every release, every fix, every improvement to Gymmobius. Updated monthly with what shipped and what’s coming next.',
    canonical: ROUTES.CHANGELOG,
    keywords: 'gymmobius changelog, release notes, product updates, gym software updates',
  },
  hero: {
    title: 'What we shipped',
    subtitle: 'A running log of releases — features, fixes, and behind-the-scenes improvements. We publish updates the same week they go live.',
  },
  entries: [
    {
      version: 'v1.4.0',
      date: 'May 2026',
      changes: [
        'New: Owner dashboard with revenue, retention, and ghost-member trends on one screen.',
        'New: Custom domain support for gym websites — point your domain in under 5 minutes.',
        'Improved: WhatsApp reminder templates now support member-name, plan-name, and due-date variables.',
        'Improved: Bulk member import accepts CSV with up to 5,000 rows; phone-number deduplication is automatic.',
        'Fixed: Attendance check-ins occasionally double-logged when scanned within 2 seconds.',
      ],
    },
    {
      version: 'v1.3.0',
      date: 'April 2026',
      changes: [
        'New: Trainer dashboards — assign members, log sessions, and track plan adherence per trainer.',
        'New: Razorpay payment links auto-generated on plan renewal with smart retry on failure.',
        'Improved: Faster member search across 10k+ rosters (P95 query time down ~70%).',
        'Fixed: Edge case where expired members appeared in active-attendance reports.',
      ],
    },
    {
      version: 'v1.2.0',
      date: 'March 2026',
      changes: [
        'New: Ghost-member detection — automatically flag members inactive for 14+ days for follow-up.',
        'New: Owner-app push notifications for new sign-ups, payments, and overdue renewals.',
        'Improved: Member mobile app now caches workout plans for offline access.',
      ],
    },
    {
      version: 'v1.1.0',
      date: 'February 2026',
      changes: [
        'New: WhatsApp payment-reminder automation with templated messages.',
        'New: Trainer invitation flow with role-based dashboard access.',
        'Improved: Payment tracking now reconciles Razorpay webhooks in real time.',
      ],
    },
    {
      version: 'v1.0.0',
      date: 'January 2026',
      changes: [
        'Initial release: member management, plans, QR attendance, Razorpay payments, and the owner dashboard.',
        'Multi-tenant architecture with row-level data isolation between gyms.',
      ],
    },
  ],
}
