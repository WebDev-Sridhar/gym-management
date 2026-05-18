import { motion } from 'framer-motion'
import { fadeUp, scrollViewport } from '../../lib/animations'
import { Link } from 'react-router-dom'
import { ROUTES, SITE } from '../../lib/constants/routes'

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: ROUTES.FEATURES },
      { label: 'Pricing', to: ROUTES.PRICING },
      { label: 'Demo', to: ROUTES.DEMO },
      { label: 'Changelog', to: ROUTES.CHANGELOG },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: ROUTES.ABOUT },
      { label: 'Blog', to: ROUTES.BLOG },
      { label: 'Careers', to: ROUTES.CAREERS },
      { label: 'Contact', to: ROUTES.CONTACT },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: ROUTES.LEGAL.PRIVACY },
      { label: 'Terms', to: ROUTES.LEGAL.TERMS },
      { label: 'Security', to: ROUTES.LEGAL.SECURITY },
      { label: 'Refund', to: ROUTES.LEGAL.REFUND },
    ],
  },
]

const socialLinks = [
  { label: 'Twitter', href: 'https://twitter.com/gymmobius' },
  { label: 'LinkedIn', href: 'https://linkedin.com/company/gymmobius' },
  { label: 'Instagram', href: 'https://instagram.com/gymmobius' },
]

export default function Footer() {
  return (
    <motion.footer
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      className="border-t border-border/50 bg-bg-elevated/30"
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <motion.div variants={fadeUp} className="col-span-2 md:col-span-1">
            <Link to={ROUTES.HOME} className="flex items-center mb-4 gap-2" aria-label={`${SITE.NAME} home`}>
              <div className="w-12 h-auto flex items-center justify-center">
                <img src="/logo.png" alt="Gymmobius logo" className="w-full h-auto" />
              </div>
              <span className="text-text-primary font-bold text-xl tracking-tight">{SITE.NAME}</span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              The complete operating system for modern gyms. Manage, grow, and retain — all in one platform.
            </p>
          </motion.div>

          {/* Link Columns */}
          {footerSections.map((section) => (
            <motion.div key={section.title} variants={fadeUp}>
              <h4 className="text-text-primary font-semibold text-sm mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-text-muted hover:text-text-secondary transition-colors duration-300 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          variants={fadeUp}
          className="mt-14 pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-text-muted text-sm">
            &copy; {new Date().getFullYear()} {SITE.NAME}. All rights reserved.
          </p>
          <div className="flex gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-purple transition-colors duration-300 text-sm"
              >
                {social.label}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.footer>
  )
}
