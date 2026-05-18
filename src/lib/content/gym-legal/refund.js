import { resolveGymFields, buildMeta, GYM_LEGAL_DEFAULTS } from './_shared'

export function getGymRefundContent(gym) {
  const g = resolveGymFields(gym)

  return {
    seo: {
      title: `Refund & Cancellation Policy · ${g.name}`,
      description: `How refunds, cancellations, and membership freezes work at ${g.name}.`,
      canonical: g.slug ? `/${g.slug}/refund` : '',
    },
    meta: buildMeta(g),
    title: 'Refund & Cancellation Policy',
    intro: `This Refund & Cancellation Policy explains how refunds, cancellations, freezes, and transfers are handled for memberships and packages purchased from ${g.name} ("the gym", "we", "us"). It forms part of our Terms & Conditions.`,
    sections: [
      {
        id: 'general',
        heading: '1. General principle',
        body: 'All membership and package fees are paid in advance and are non-refundable once the plan is activated, except in the specific circumstances described below. We do not offer pro-rated refunds for unused days, missed sessions, or voluntary non-attendance.',
      },
      {
        id: 'cooling-off',
        heading: '2. Cooling-off period for new members',
        body: 'If you are a first-time member and have not yet used the facility, you may request a full refund of your membership fee within 48 hours of payment. Once you have entered the facility, attended a class, or used any service, the cooling-off period no longer applies.',
      },
      {
        id: 'medical-refunds',
        heading: '3. Medical inability to continue',
        body: 'If you are medically unable to continue training due to a serious illness, injury, or pregnancy-related complication, you may request either: (a) a freeze of your membership for up to 90 days, or (b) a pro-rated refund of the unused portion of your plan, subject to a valid medical certificate from a registered medical practitioner. The request must be submitted within 30 days of the medical event.',
      },
      {
        id: 'freeze',
        heading: '4. Membership freeze',
        body: 'Members on plans of 3 months or longer may freeze their membership once per plan cycle for a continuous period of 15 to 60 days, subject to advance written request. Freeze time extends the validity of your plan but does not reduce its cost. A nominal processing fee may apply.',
      },
      {
        id: 'transfer',
        heading: '5. Transfers',
        body: 'Memberships are personal and not transferable to another individual. Unused personal training sessions within an active plan may, at our sole discretion, be transferred to an immediate family member with prior written approval.',
      },
      {
        id: 'pt-sessions',
        heading: '6. Personal training and packages',
        body: 'Personal training packages are valid for the duration printed on the package. Unused sessions at the end of the validity period are forfeited and not refunded. If your trainer is unavailable due to reasons attributable to the gym, we will offer either rescheduling with another qualified trainer or an extension of the package.',
      },
      {
        id: 'duplicate-payments',
        heading: '7. Duplicate or accidental payments',
        body: 'If you have been charged twice for the same plan, or a payment was processed in error, we will refund the duplicate amount in full. Please raise such requests within 30 days of the transaction so we can reconcile with Razorpay or the original payment provider.',
      },
      {
        id: 'gym-initiated-cancellation',
        heading: '8. Cancellation by the gym',
        body: 'If we cancel your membership for a breach of our Terms & Conditions or Membership Agreement, no refund will be issued. If we permanently close the facility for reasons not attributable to a member, we will refund the unused portion of active memberships on a pro-rata basis.',
      },
      {
        id: 'voluntary-cancellation',
        heading: '9. Voluntary cancellation',
        body: 'You may stop attending the facility at any time. Voluntary cancellation does not entitle you to a refund of the unused period, except as described in this Policy. To formally cancel an auto-renewing subscription, please inform us in writing at least 7 days before the next renewal date.',
      },
      {
        id: 'refund-processing',
        heading: '10. Refund process and timeline',
        body: `To request a refund, please ${g.contactLine} and include the registered name, transaction reference or invoice number, and a brief reason. Approved refunds are processed back to the original payment method within 7–10 business days. Razorpay and bank processing times may add a few additional days.`,
      },
      {
        id: 'taxes',
        heading: '11. Taxes',
        body: 'Any applicable taxes (GST, where applicable) paid on a transaction will be refunded along with the principal amount where a full or partial refund is approved.',
      },
      {
        id: 'governing-law',
        heading: '12. Governing law',
        body: `This Policy is governed by the ${GYM_LEGAL_DEFAULTS.governingLaw} and forms part of our Terms & Conditions. Any dispute will be subject to the exclusive jurisdiction of ${g.courts}.`,
      },
      {
        id: 'contact',
        heading: '13. Contact',
        body: `For any refund or cancellation request, please ${g.contactLine}.${g.address ? ` You can also visit us at ${g.address}.` : ''}`,
      },
    ],
  }
}
