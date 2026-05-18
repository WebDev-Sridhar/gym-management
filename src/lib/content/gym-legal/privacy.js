import { resolveGymFields, buildMeta, GYM_LEGAL_DEFAULTS } from './_shared'

export function getGymPrivacyContent(gym) {
  const g = resolveGymFields(gym)

  return {
    seo: {
      title: `Privacy Policy · ${g.name}`,
      description: `How ${g.name} collects, uses, and protects your personal information as a member or visitor.`,
      canonical: g.slug ? `/${g.slug}/privacy` : '',
    },
    meta: buildMeta(g),
    title: 'Privacy Policy',
    intro: `This Privacy Policy describes how ${g.name} ("we", "us", "the gym") collects, uses, stores, and protects information you provide when you sign up for a membership, attend the facility, or interact with our digital services. Please read it carefully. If you have any questions, ${g.contactLine}.`,
    sections: [
      {
        id: 'who-we-are',
        heading: '1. Who we are',
        body: `${g.name} is a fitness facility${g.city ? ` operating in ${g.city}, India` : ' operating in India'}${g.address ? ` at ${g.address}` : ''}. We use ${GYM_LEGAL_DEFAULTS.platformName}, a multi-tenant gym management platform, to operate memberships, attendance, payments, and member communication on our behalf.`,
      },
      {
        id: 'information-we-collect',
        heading: '2. Information we collect',
        body: 'We collect: (a) identity and contact information you submit at the time of joining (full name, age, gender, photo, address, phone number, email); (b) health and fitness information you voluntarily share (height, weight, body measurements, fitness goals, medical conditions or injuries relevant to safe training); (c) emergency contact details for use in the event of an injury at the facility; (d) attendance records (check-in time, date, branch, scanned QR or biometric ID); (e) payment metadata (transaction reference, amount, plan, status — never your raw card or UPI credentials); (f) communications you send us via WhatsApp, email, or the member app; (g) recordings from CCTV cameras installed in common training areas for member and staff safety.',
      },
      {
        id: 'how-we-use-data',
        heading: '3. How we use your information',
        body: `We use your information to: (a) verify identity and grant access to the facility; (b) deliver the services in your membership plan, including coaching, classes, and personal training; (c) collect membership fees and send renewal reminders via WhatsApp, email, or in-app notifications; (d) record attendance and track training progress where you have opted in; (e) respond to your questions and provide member support; (f) ensure the safety of members and staff; (g) comply with applicable laws and respond to lawful requests; (h) send occasional updates about new classes, offers, or facility changes — you can unsubscribe at any time. We will not use your information for any other purpose without your consent.`,
      },
      {
        id: 'lawful-basis',
        heading: '4. Lawful basis for processing',
        body: 'We process your personal information under one or more of the following bases: performance of the membership contract; legitimate interest in operating the facility safely and responsibly; consent (for health information, marketing communications, and any biometric attendance); and legal obligation (tax records and lawful disclosure).',
      },
      {
        id: 'sharing',
        heading: '5. Who we share information with',
        body: `We do not sell your information. We share limited information only with: (a) ${GYM_LEGAL_DEFAULTS.platformName} as our software service provider, under a data-processing arrangement; (b) Razorpay or our payment gateway, to process subscription and one-time payments; (c) WhatsApp, email, and SMS providers, to deliver communications you have agreed to receive; (d) emergency medical responders in the event of an injury at the facility; (e) law-enforcement or regulatory authorities, only when legally compelled. Your information is never shared with other gyms or third-party advertisers.`,
      },
      {
        id: 'cctv',
        heading: '6. CCTV and recorded media',
        body: 'CCTV cameras are installed in common training areas, entrances, and reception for the safety of members and staff and the protection of property. Cameras are not installed in changing rooms, showers, or toilets. Recorded footage is retained for up to 30 days and is accessed only by authorized staff for safety incidents, theft investigation, or as legally required.',
      },
      {
        id: 'data-security',
        heading: '7. How we keep your information secure',
        body: `Member data is stored on the ${GYM_LEGAL_DEFAULTS.platformName} platform, which encrypts data in transit (TLS 1.2+) and at rest, and enforces strict tenant isolation at the database layer. Payment credentials are tokenized by Razorpay and never stored on our or the platform's servers. Physical records, if any, are stored in locked premises with access limited to authorized staff.`,
      },
      {
        id: 'data-retention',
        heading: '8. How long we keep your information',
        body: `We retain your personal information for as long as you are an active member and for up to ${GYM_LEGAL_DEFAULTS.dataRetentionMonths} months after your membership ends, to support reactivation, handle disputes, and meet tax and accounting requirements. After that period, your information is securely deleted or anonymized. Payment and tax records may be retained for the longer period required by Indian law.`,
      },
      {
        id: 'your-rights',
        heading: '9. Your rights',
        body: `You have the right to: (a) access the personal information we hold about you; (b) request correction of inaccurate or outdated information; (c) request a copy of your information in a portable format; (d) request deletion of your information, subject to legal retention requirements; (e) withdraw consent for marketing communications at any time. To exercise any of these rights, ${g.contactLine}. We respond to verified requests within 30 days.`,
      },
      {
        id: 'children',
        heading: '10. Children and minors',
        body: 'We accept members aged 16 and above. Members aged 16–17 must have written consent from a parent or legal guardian, who will be treated as the primary contact for billing and safety communications. We do not knowingly collect information from children under 16.',
      },
      {
        id: 'changes',
        heading: '11. Changes to this policy',
        body: 'We may update this Privacy Policy from time to time. If we make material changes that affect how we handle your information, we will notify you in advance via WhatsApp, email, or a notice at the facility. The "Last updated" date above always reflects the current version.',
      },
      {
        id: 'contact',
        heading: '12. Contact us',
        body: `For any questions, complaints, or requests related to your personal information, please ${g.contactLine}.${g.address ? ` You can also visit us at ${g.address}.` : ''}`,
      },
    ],
  }
}
