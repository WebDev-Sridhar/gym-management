import { ROUTES } from '../constants/routes'

export const CONTACT_CONTENT = {
  seo: {
    title: 'Contact',
    description: 'Get in touch with the Gymmobius team. Sales questions, onboarding help, or feature requests — we reply within one business day.',
    canonical: ROUTES.CONTACT,
    keywords: 'contact gymmobius, gym software support, gym software sales, gymmobius help',
  },
  hero: {
    title: 'Talk to a human.',
    subtitle: 'Sales, onboarding, or product questions — drop us a note below and a real person will reply within one business day. For urgent account issues, email support@gymmobius.com.',
  },
  form: {
    nameLabel: 'Full name',
    emailLabel: 'Work email',
    phoneLabel: 'Phone (optional)',
    messageLabel: 'What can we help with?',
    submitLabel: 'Send message',
    submittingLabel: 'Sending…',
    successMessage: 'Thanks — we got it. A team member will reply within one business day.',
    errorMessage: 'We couldn’t send your message. Please try again, or email us directly at support@gymmobius.com.',
  },
}
