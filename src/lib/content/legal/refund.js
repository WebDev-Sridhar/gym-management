import { ROUTES } from '../../constants/routes'
import { LEGAL_META } from '../../constants/legal'

export const REFUND_CONTENT = {
  seo: {
    title: 'Refund Policy',
    description: 'How Gymmobius handles refunds for subscriptions, free trials, duplicate charges, and exceptional cases. Governed by the laws of India.',
    canonical: ROUTES.LEGAL.REFUND,
  },
  meta: LEGAL_META,
  title: 'Refund Policy',
  intro: 'This Refund Policy explains when refunds are available for subscriptions and payments made on Gymmobius, how to request one, and how long the process takes. It applies to platform subscription fees paid by gym owners.',
  sections: [
    {
      id: 'subscription-fees',
      heading: '1. Subscription fees',
      body: 'Subscription fees are billed in advance on a monthly or annual basis for the plan you choose. Once a billing cycle has begun, the fee for that cycle is non-refundable, except as described below. We do not pro-rate refunds for partial months.',
    },
    {
      id: 'free-trial',
      heading: '2. Free trial',
      body: 'New gyms can evaluate Gymmobius during the free-trial window before any payment is taken. You will not be charged until the trial ends and you actively choose a paid plan. There is no automatic conversion from trial to paid.',
    },
    {
      id: 'annual-plans',
      heading: '3. Annual plans',
      body: 'If you cancel an annual plan within the first 14 days of the initial subscription, you may request a full refund of the annual fee. Cancellations after that window are not refunded, but your access continues until the end of the paid period.',
    },
    {
      id: 'duplicate-charges',
      heading: '4. Duplicate or accidental charges',
      body: 'If you were charged twice for the same billing cycle, or if a payment was processed in error, we will refund the duplicate amount in full. Please report duplicate charges within 30 days of the transaction so we can reconcile with Razorpay.',
    },
    {
      id: 'service-outages',
      heading: '5. Material service outages',
      body: 'If the production service experiences a material outage attributable to us (excluding scheduled maintenance and third-party provider incidents), we may issue a pro-rated service credit applied to your next invoice. Credits are issued at our discretion based on incident severity and duration.',
    },
    {
      id: 'member-payments',
      heading: '6. Member payments collected through the platform',
      body: 'Refunds for payments collected by a gym from its members (membership fees, personal training fees, etc.) are between the gym and the member. Gymmobius does not adjudicate or process refunds on behalf of a gym’s members. Gyms can issue refunds via Razorpay using the standard Razorpay refund flow.',
    },
    {
      id: 'cancellation',
      heading: '7. Cancellation',
      body: 'You may cancel your subscription at any time from the dashboard. Cancellation stops future billing but does not refund the current billing cycle. Access continues until the end of the paid period, after which the account moves to read-only and then to scheduled deletion per our Privacy Policy.',
    },
    {
      id: 'how-to-request',
      heading: '8. How to request a refund',
      body: `Send an email to ${LEGAL_META.supportContact} with: (a) the gym name and registered email; (b) the Razorpay transaction ID or invoice number; (c) the reason for the request. We acknowledge requests within one business day and resolve eligible refunds within 7–10 business days. Refunds are credited back to the original payment method.`,
    },
    {
      id: 'jurisdiction',
      heading: '9. Governing law',
      body: `This Refund Policy is governed by the ${LEGAL_META.governingLaw} and forms part of our Terms of Service.`,
    },
  ],
}
