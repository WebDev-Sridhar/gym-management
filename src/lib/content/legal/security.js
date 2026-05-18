import { ROUTES } from '../../constants/routes'
import { LEGAL_META } from '../../constants/legal'

export const SECURITY_CONTENT = {
  seo: {
    title: 'Security',
    description: 'How Gymmobius keeps gym and member data safe — encryption, multi-tenant isolation, payment security, and our incident response process.',
    canonical: ROUTES.LEGAL.SECURITY,
  },
  meta: LEGAL_META,
  title: 'Security',
  intro: 'Gym owners trust us with member contact details, payment history, and the operational data that runs their business. We take that seriously. This page describes the technical and organizational controls we have in place to protect your data.',
  sections: [
    {
      id: 'data-encryption',
      heading: 'Encryption in transit and at rest',
      body: 'All traffic between your browser, our APIs, and our database is encrypted using TLS 1.2 or higher. Data at rest in our Postgres database is encrypted using AES-256 disk-level encryption. Encrypted backups are stored in geographically separate availability zones.',
    },
    {
      id: 'multi-tenant-isolation',
      heading: 'Multi-tenant isolation',
      body: 'Every gym’s data is isolated using Postgres row-level security (RLS). Every query — including reads, writes, and aggregations — is authorized at the database layer using the requester’s tenant ID. This means a misconfigured application layer cannot leak data across gyms; the database itself enforces isolation.',
    },
    {
      id: 'authentication',
      heading: 'Authentication and access',
      body: 'User accounts are protected by password hashing (bcrypt) with strong cost factors. We support email/password authentication, with optional OTP verification for sensitive flows. Trainer and member roles are scoped — a trainer can only see assigned members, a member can only see their own data. Session tokens are short-lived and refresh automatically.',
    },
    {
      id: 'payment-security',
      heading: 'Payment security',
      body: 'Payments are processed by Razorpay, a PCI-DSS Level 1 certified payment provider. We never see or store raw card numbers, CVVs, or UPI credentials on our servers — only tokenized references and transaction metadata. Webhook signatures from Razorpay are verified on every callback to prevent spoofed payment events.',
    },
    {
      id: 'infrastructure',
      heading: 'Infrastructure',
      body: 'Gymmobius runs on Supabase (managed Postgres, auth, and storage) in the Asia-Pacific region. Supabase is SOC 2 Type II compliant. Production access requires multi-factor authentication and is restricted to a small, named set of engineers. All production actions are logged for audit.',
    },
    {
      id: 'secure-development',
      heading: 'Secure development',
      body: 'Code changes go through review, automated tests, and staged deployment. Dependencies are scanned for known vulnerabilities on every build. Secrets are managed in a dedicated vault — never checked into source control. We follow OWASP Top 10 guidance for web application security.',
    },
    {
      id: 'monitoring',
      heading: 'Monitoring and abuse prevention',
      body: 'We monitor API request patterns for anomalies (e.g., brute-force attempts, scraping, payment-replay attacks). Suspicious activity triggers rate limiting and, where appropriate, account suspension and operator alerts.',
    },
    {
      id: 'data-portability',
      heading: 'Data portability and deletion',
      body: 'Gym owners can export member, payment, and attendance data from the dashboard at any time. On account closure, data is retained per our Privacy Policy and then permanently deleted from production and backup storage.',
    },
    {
      id: 'incident-response',
      heading: 'Incident response',
      body: `We maintain a documented incident-response process. If we detect a security incident that affects customer data, we will notify impacted gyms without undue delay — typically within 72 hours — along with the facts known, remediation steps, and recommended actions. Report a suspected security issue to ${LEGAL_META.supportContact}; we triage every report within one business day.`,
    },
    {
      id: 'responsible-disclosure',
      heading: 'Responsible disclosure',
      body: `If you’re a security researcher and believe you’ve found a vulnerability, please email ${LEGAL_META.supportContact} with details and steps to reproduce. We commit to: (a) acknowledging within 2 business days, (b) keeping you informed of remediation progress, and (c) not pursuing legal action against good-faith research conducted under this policy.`,
    },
  ],
}
