import { motion } from 'framer-motion'
import { fadeUp, scrollViewport } from '../../lib/animations'
import { Link } from 'react-router-dom'

const footerLinks = {
  Product: ['Features', 'Pricing', 'Demo', 'Changelog'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Security','Refund'],
}
const routeMap = {
  // Product
  Features: '/features',
  Pricing: '/pricing',
  Demo: '/demo',
  Changelog: '/changelog',

  // Company
  About: '/about',
  Blog: '/blog',
  Careers: '/careers',
  Contact: '/contact',

  // Legal
  Privacy: '/privacy',
  Terms: '/terms',
  Security: '/security',
  Refund : '/refund-policy',
}
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
            <div className="flex items-center mb-4 gap-2">
              <div className="w-12 h-auto flex items-center justify-center">
               <img src="/logo.png" alt="Logo" className="w-full h-auto" />
              </div>
              <span className="text-text-primary font-bold text-xl tracking-tight">Gymmobius</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              The complete operating system for modern gyms. Manage, grow, and retain — all in one platform.
            </p>
          </motion.div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <motion.div key={title} variants={fadeUp}>
              <h4 className="text-text-primary font-semibold text-sm mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                <Link
  to={routeMap[link] || '#'}
  className="text-text-muted hover:text-text-secondary transition-colors duration-300 text-sm"
>
  {link}
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
            &copy; {new Date().getFullYear()} Gymmobius. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Twitter', 'LinkedIn', 'Instagram'].map((social) => (
              <a
                key={social}
                href="#"
                className="text-text-muted hover:text-accent-purple transition-colors duration-300 text-sm"
              >
                {social}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.footer>
  )
}
