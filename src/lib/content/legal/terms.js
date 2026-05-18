import { ROUTES } from '../../constants/routes'
import { LEGAL_META } from '../../constants/legal'

export const TERMS_CONTENT = {
  seo: {
    title: 'Terms of Service',
    description: 'The terms governing your use of Gymmobius — subscriptions, acceptable use, payment, liability, and termination. Governed by the laws of India.',
    canonical: ROUTES.LEGAL.TERMS,
  },
  meta: LEGAL_META,
  title: 'Terms of Service',
  intro: 'These Terms govern your access to and use of Gymmobius. By creating an account or using the platform, you agree to these Terms on behalf of yourself and, if applicable, the gym or business you represent.',
  sections: [
    {
      id: 'the-service',
      heading: '1. The service',
      body: 'Gymmobius is a software-as-a-service platform that helps gym owners manage members, payments, attendance, trainers, and member communication. We provide the software, hosting, and support; you provide the gym, the members, and the operational decisions.',
    },
    {
      id: 'account-eligibility',
      heading: '2. Account eligibility',
      body: 'You must be at least 18 years old and authorized to bind the business you sign up for. You are responsible for maintaining the confidentiality of your login credentials, for all activity under your account, and for keeping contact information current so we can reach you about service-critical events.',
    },
    {
      id: 'acceptable-use',
      heading: '3. Acceptable use',
      body: 'You agree not to: (a) use the platform to send unsolicited bulk messages, spam, or content that violates law; (b) reverse-engineer, scrape, or attempt to bypass access controls; (c) upload data you do not have the right to process; (d) impersonate another person or gym; (e) interfere with the security or availability of the service for others. Violations may result in suspension without notice.',
    },
    {
      id: 'member-data',
      heading: '4. Your responsibilities for member data',
      body: 'When you upload member information, you confirm that you have a lawful basis to process it (member consent, contract performance, or legitimate interest). You are the data controller for member data; Gymmobius is the data processor. You agree to honor member requests for access, correction, or deletion of their data.',
    },
    {
      id: 'subscriptions',
      heading: '5. Subscriptions and billing',
      body: 'Subscription fees are billed in advance on a monthly or annual basis per the plan you select. Fees are stated in Indian Rupees and exclusive of applicable taxes. We may revise pricing with at least 30 days’ written notice; changes will take effect at your next renewal. Failure to pay may result in service suspension after a grace period.',
    },
    {
      id: 'payments',
      heading: '6. Payments and refunds',
      body: 'Payments are processed through Razorpay. We do not store card or UPI credentials on our servers. Refunds, where applicable, are governed by our Refund Policy. Disputed charges should be raised within 30 days of the transaction.',
    },
    {
      id: 'service-levels',
      heading: '7. Service availability',
      body: 'We target 99.5% monthly uptime for the production service, excluding scheduled maintenance (announced at least 48 hours in advance) and events outside our reasonable control. Status and incident history are available via in-app notifications and email alerts. We are not liable for downstream impact of downtime beyond pro-rated service credits where applicable.',
    },
    {
      id: 'intellectual-property',
      heading: '8. Intellectual property',
      body: 'Gymmobius, its software, designs, and branding are owned by us. Content you upload (member data, gym branding, messages) remains yours; you grant us a limited license to host, process, and display it solely to deliver the service. We may use aggregate, de-identified usage data to improve the product.',
    },
    {
      id: 'third-party-services',
      heading: '9. Third-party services',
      body: 'The platform integrates with third-party services including Razorpay (payments), Supabase (hosting), and WhatsApp/email gateways (messaging). Your use of those integrations is also subject to their respective terms. We are not responsible for third-party outages or actions beyond our reasonable control.',
    },
    {
      id: 'warranty-disclaimer',
      heading: '10. Warranty disclaimer',
      body: 'The service is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, we disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We make no warranty that the service will meet every operational need of every gym.',
    },
    {
      id: 'limitation-of-liability',
      heading: '11. Limitation of liability',
      body: 'To the maximum extent permitted by law, our aggregate liability for any claim arising out of these Terms is limited to the fees you paid us in the 12 months preceding the event giving rise to the claim. We are not liable for indirect, incidental, or consequential damages, including lost profits or member churn.',
    },
    {
      id: 'termination',
      heading: '12. Termination',
      body: 'You may cancel your subscription at any time from the dashboard; access continues through the end of the paid period. We may suspend or terminate accounts that violate these Terms or that pose a security or compliance risk. On termination, you can export your data for up to 30 days, after which it is permanently deleted per our Privacy Policy.',
    },
    {
      id: 'changes',
      heading: '13. Changes to these Terms',
      body: 'We may update these Terms as the product evolves or as required by law. Material changes will be announced in-app and via email at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.',
    },
    {
      id: 'jurisdiction',
      heading: '14. Governing law and jurisdiction',
      body: `These Terms are governed by the ${LEGAL_META.governingLaw}. Any disputes will be subject to the exclusive jurisdiction of the courts of ${LEGAL_META.jurisdiction}.`,
    },
    {
      id: 'contact',
      heading: '15. Contact',
      body: `Questions about these Terms? Reach us at ${LEGAL_META.supportContact}.`,
    },
  ],
}
