import { resolveGymFields, buildMeta, GYM_LEGAL_DEFAULTS } from './_shared'

export function getGymTermsContent(gym) {
  const g = resolveGymFields(gym)

  return {
    seo: {
      title: `Terms & Conditions · ${g.name}`,
      description: `The terms and conditions that govern your membership and use of facilities at ${g.name}.`,
      canonical: g.slug ? `/${g.slug}/terms` : '',
    },
    meta: buildMeta(g),
    title: 'Terms & Conditions',
    intro: `These Terms & Conditions ("Terms") govern your membership at ${g.name} ("the gym", "we", "us") and your use of our facilities, services, and digital channels. By signing up for a membership, entering the facility, or using our member app, you agree to be bound by these Terms together with our Privacy Policy, Refund & Cancellation Policy, Membership Agreement, and Health & Liability Waiver.`,
    sections: [
      {
        id: 'eligibility',
        heading: '1. Eligibility',
        body: 'You must be at least 18 years old to enrol independently. Members aged 16–17 require written consent from a parent or legal guardian. By signing up, you confirm that you are in good health to undertake physical exercise and that you have disclosed any pre-existing medical conditions, injuries, pregnancy, or medication that may affect your training.',
      },
      {
        id: 'membership',
        heading: '2. Membership and access',
        body: 'Your membership is personal and non-transferable. Membership cards, QR codes, or biometric credentials must be used only by the registered member. Sharing access credentials is grounds for suspension or termination without refund. Lost cards or compromised credentials must be reported promptly.',
      },
      {
        id: 'fees-and-payment',
        heading: '3. Fees and payment',
        body: 'Membership fees are payable in advance for the selected plan duration. Payments are processed through Razorpay and other payment partners. All fees are stated in Indian Rupees and exclusive of applicable taxes unless explicitly stated. Failed or late payments may result in temporary suspension of access until dues are cleared. We may revise fees with at least 30 days\' notice; existing plans will be honoured at the rate paid until the next renewal.',
      },
      {
        id: 'hours-and-availability',
        heading: '4. Hours and facility availability',
        body: 'The facility operates during published hours, which may be revised seasonally or for maintenance, public holidays, or events. We will make reasonable efforts to notify members in advance of planned closures. We are not liable for short-term unavailability of specific equipment or classes due to maintenance, repairs, or instructor leave.',
      },
      {
        id: 'classes-and-training',
        heading: '5. Classes and personal training',
        body: 'Class schedules are subject to change. Personal training sessions are pre-booked and consumed within the validity period of the package; unused sessions may expire as per the package terms. Only trainers employed or authorised by the gym may conduct paid training on the premises. Engaging external trainers for paid coaching inside the facility is not permitted.',
      },
      {
        id: 'conduct',
        heading: '6. Member conduct',
        body: 'Members are expected to behave respectfully toward other members, staff, and trainers. Harassment, intoxication, aggressive behaviour, theft, vandalism, or any conduct that disturbs the safety, dignity, or training of others is grounds for immediate suspension or termination without refund. Detailed rules of conduct are outlined in our Membership Agreement.',
      },
      {
        id: 'personal-property',
        heading: '7. Personal property',
        body: 'Lockers, where provided, are for short-term use during your visit. We strongly advise against bringing valuables to the gym. The gym is not responsible for loss, theft, or damage to personal property left on the premises, including in lockers, common areas, or the parking area.',
      },
      {
        id: 'liability',
        heading: '8. Assumption of risk and liability',
        body: 'Exercise carries an inherent risk of injury. By becoming a member, you acknowledge that you train at your own risk and that you have read and accepted our Health & Liability Waiver. To the maximum extent permitted by law, the gym, its owners, employees, and trainers are not liable for injury, illness, loss, or damage arising from your use of the facility, except where caused by gross negligence or wilful misconduct on our part.',
      },
      {
        id: 'cctv-and-data',
        heading: '9. CCTV, data, and communications',
        body: `CCTV is operated in common training areas for safety. Your personal information is handled in accordance with our Privacy Policy. Operational communications (renewals, attendance summaries, schedule changes) may be sent via WhatsApp, email, or SMS using ${GYM_LEGAL_DEFAULTS.platformName}, our software service provider.`,
      },
      {
        id: 'cancellation-and-refunds',
        heading: '10. Cancellation and refunds',
        body: 'Cancellations and refunds are governed by our separate Refund & Cancellation Policy. In general, fees paid are non-refundable except where explicitly allowed, such as a medical inability to continue or a duplicate charge.',
      },
      {
        id: 'suspension-and-termination',
        heading: '11. Suspension and termination',
        body: 'We may suspend or terminate your membership without refund for: (a) breach of these Terms or our house rules; (b) non-payment of dues; (c) misuse of facilities or credentials; (d) conduct that endangers the safety or dignity of others; (e) any unlawful activity on or related to the premises. Where appropriate, we will give written notice and an opportunity to remedy the breach before terminating.',
      },
      {
        id: 'force-majeure',
        heading: '12. Force majeure',
        body: 'We are not liable for failure to provide services due to events outside our reasonable control, including natural disasters, civil disturbances, pandemics, government orders, power or utility failures, or any other event of force majeure. In such cases, we will make reasonable efforts to extend memberships or restore services once conditions permit.',
      },
      {
        id: 'changes',
        heading: '13. Changes to these Terms',
        body: 'We may update these Terms from time to time to reflect changes in our services, applicable law, or operational practice. Material changes will be communicated by WhatsApp, email, or a notice at the facility at least 14 days before they take effect. Continued use of the facility after that date constitutes acceptance of the revised Terms.',
      },
      {
        id: 'governing-law',
        heading: '14. Governing law and jurisdiction',
        body: `These Terms are governed by and construed in accordance with the ${GYM_LEGAL_DEFAULTS.governingLaw}. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of ${g.courts}.`,
      },
      {
        id: 'contact',
        heading: '15. Contact',
        body: `For any questions about these Terms, please ${g.contactLine}.${g.address ? ` You can also visit us at ${g.address}.` : ''}`,
      },
    ],
  }
}
