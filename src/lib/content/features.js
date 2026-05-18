import { ROUTES } from '../constants/routes'
import { FEATURES } from '../constants'

export const FEATURES_CONTENT = {
  seo: {
    title: 'Features',
    description: 'Everything you need to run a modern gym — QR check-ins, automated payment collection, trainer workflows, WhatsApp reminders, and real-time analytics in one platform.',
    canonical: ROUTES.FEATURES,
    keywords: 'gym software features, qr attendance, payment automation, gym analytics, trainer management, whatsapp reminders',
  },
  hero: {
    title: 'Run your gym on one platform — not seven tools.',
    subtitle: 'Replace registers, spreadsheets, payment trackers, and reminder lists with a single system designed for how gyms actually operate.',
  },
  features: FEATURES,
  cta: {
    title: 'See it in your gym',
    subtitle: 'Set up your gym in under 10 minutes. Import members, configure plans, and start collecting payments the same day — no card required.',
    label: 'Start managing your gym',
    to: ROUTES.AUTH.SIGNUP,
  },
}
