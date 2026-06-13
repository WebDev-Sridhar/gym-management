import { Link } from 'react-router-dom'
import { SocialIcon } from '../../lib/socialPlatforms'
import { ROUTES, SITE } from '../../lib/constants/routes'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: ROUTES.V2.FEATURES },
      { label: 'Pricing', to: ROUTES.V2.PRICING },
      { label: 'Changelog', to: ROUTES.V2.CHANGELOG },      { label: 'Demo', to: ROUTES.V2.DEMO },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: ROUTES.V2.ABOUT },
      { label: 'Careers', to: ROUTES.V2.CAREERS },
      { label: 'Blog', to: ROUTES.V2.BLOG },
      { label: 'Contact', to: ROUTES.V2.CONTACT },
    ],
  },

  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: ROUTES.V2.PRIVACY },
      { label: 'Terms of Service', to: ROUTES.V2.TERMS },
      { label: 'Security', to: ROUTES.V2.SECURITY },
      { label: 'Refund Policy', to: ROUTES.V2.REFUND },
    ],
  },
]

const SOCIALS = [
  { platform: 'instagram', href: 'https://instagram.com', label: 'Instagram' },
  { platform: 'twitter', href: 'https://twitter.com', label: 'Twitter' },
  { platform: 'linkedin', href: 'https://linkedin.com', label: 'LinkedIn' },
  { platform: 'youtube', href: 'https://youtube.com', label: 'YouTube' },
]

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Link to={ROUTES.V2.HOME} className="flex items-center gap-2 mb-4">
              <div className="w-10 h-auto flex items-center justify-center">
            <img src="/logo.png" alt="Gymmobius logo" className="w-full h-auto" />
          </div>
              <span className="font-semibold text-gray-900 text-lg">Gymmobius</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              {SITE.TAGLINE}. Memberships, attendance, payments, trainers, analytics and mobile access — all in one platform.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {SOCIALS.map(({ platform, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                >
                  <SocialIcon platform={platform} className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} {SITE.NAME}. All rights reserved.</p>
          <a href={`mailto:${SITE.SUPPORT_EMAIL}`} className="text-sm text-gray-500 hover:text-gray-900">
            {SITE.SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
