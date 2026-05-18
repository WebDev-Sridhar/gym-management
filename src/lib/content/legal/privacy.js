import { ROUTES } from '../../constants/routes'
import { LEGAL_META } from '../../constants/legal'

export const PRIVACY_CONTENT = {
  seo: {
    title: 'Privacy Policy',
    description: 'How Gymmobius collects, uses, stores, and protects gym, member, and trainer data. Governed by the laws of India.',
    canonical: ROUTES.LEGAL.PRIVACY,
  },
  meta: LEGAL_META,
  title: 'Privacy Policy',
  intro: 'This Privacy Policy explains what information Gymmobius collects when you use our platform, how we use it, who we share it with, and the choices you have. It applies to gym owners, trainers, members, and anyone who interacts with a Gymmobius-powered service.',
  sections: [
    {
      id: 'who-we-are',
      heading: '1. Who we are',
      body: `Gymmobius is operated by ${LEGAL_META.companyName}, a software company based in ${LEGAL_META.jurisdiction}. We provide a multi-tenant SaaS platform that helps gym owners manage members, payments, attendance, and trainers. For any privacy-related question, write to ${LEGAL_META.supportContact}.`,
    },
    {
      id: 'information-we-collect',
      heading: '2. Information we collect',
      body: 'Account data (name, email, phone number, password hash, role); gym data (gym name, plans, branding, settings); member data (name, contact details, membership plan, attendance, payment history) — submitted by gym owners on behalf of their members; trainer data (name, contact details, assigned members, schedule); payment metadata from Razorpay (transaction ID, status, amount — never raw card or UPI credentials); device and log data (IP address, browser type, timestamps) for security and abuse prevention.',
    },
    {
      id: 'how-we-use-data',
      heading: '3. How we use your data',
      body: 'To operate the platform (authentication, attendance, billing, notifications); to process payments via Razorpay and reconcile webhooks; to send transactional WhatsApp, email, and in-app messages on behalf of the gym; to detect operational issues such as ghost members and payment failures; to improve performance, fix bugs, and develop new features; to comply with legal obligations and respond to lawful requests.',
    },
    {
      id: 'lawful-basis',
      heading: '4. Lawful basis for processing',
      body: 'We process data under one or more of: performance of contract (delivering the service you signed up for), legitimate interest (fraud prevention, platform security, product improvement), consent (where you explicitly opt in, such as marketing emails), and legal obligation (tax records, lawful disclosure).',
    },
    {
      id: 'sharing',
      heading: '5. Who we share data with',
      body: 'We do not sell your data. We share limited data with: Razorpay (to process payments); Supabase (our hosted database and authentication provider); WhatsApp/email/SMS gateways (to deliver messages you initiate); analytics providers (in aggregated, non-identifiable form); and law enforcement, only when legally compelled. Members’ data is shared only with their own gym — never across tenants.',
    },
    {
      id: 'member-data-controllership',
      heading: '6. Gym as data controller for member data',
      body: 'When a gym uploads member data to Gymmobius, the gym acts as the data controller and Gymmobius acts as the data processor. Members with questions about their data should contact their gym directly. Gyms can export or delete member records from the owner dashboard at any time.',
    },
    {
      id: 'data-security',
      heading: '7. How we protect your data',
      body: 'Data is encrypted in transit (TLS 1.2+) and at rest. Multi-tenant isolation is enforced at the database layer using Postgres row-level security. Access to production systems is limited to authorized engineers, logged, and audited. Payment credentials are never stored on our servers — Razorpay handles tokenization.',
    },
    {
      id: 'data-retention',
      heading: '8. Data retention',
      body: `We retain account and gym data for as long as your subscription is active. After account closure, data is retained for up to ${LEGAL_META.dataRetentionMonths} months to support reactivation, then permanently deleted from production systems. Encrypted backups are purged within 90 days of deletion. Tax and payment records are retained for the period required by Indian law.`,
    },
    {
      id: 'your-rights',
      heading: '9. Your rights',
      body: `You can access, correct, export, or delete your account data at any time from your dashboard, or by writing to ${LEGAL_META.supportContact}. We respond to verified requests within 30 days. If you believe we are mishandling your data, you may contact us first — we take it seriously — or escalate to the appropriate regulator.`,
    },
    {
      id: 'cookies',
      heading: '10. Cookies and similar technologies',
      body: 'We use essential cookies for authentication and session management, and lightweight analytics cookies to understand how the product is used. We do not use third-party advertising cookies. You can disable non-essential cookies in your browser without affecting core functionality.',
    },
    {
      id: 'international-transfers',
      heading: '11. International transfers',
      body: 'Our primary data hosting is in the Asia-Pacific region. Some sub-processors (e.g., email delivery providers) may process data in other jurisdictions under standard contractual safeguards.',
    },
    {
      id: 'children',
      heading: '12. Children’s privacy',
      body: 'Gymmobius is not intended for use by individuals under 16. We do not knowingly collect data from minors. If you believe a minor has provided data without parental consent, contact us and we will remove it.',
    },
    {
      id: 'changes',
      heading: '13. Changes to this policy',
      body: 'We may update this Privacy Policy as the product or law evolves. Material changes will be announced in-app and via email at least 14 days before they take effect. The “Last updated” date above always reflects the current version.',
    },
    {
      id: 'jurisdiction',
      heading: '14. Governing law',
      body: `This Privacy Policy is governed by the ${LEGAL_META.governingLaw}. For any questions, contact ${LEGAL_META.supportContact}.`,
    },
  ],
}
