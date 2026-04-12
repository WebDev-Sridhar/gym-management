import { motion } from 'framer-motion'
import { fadeUp, scrollViewport } from '../../lib/animations'

const footerLinks = {
  Product: ['Features', 'Pricing', 'Demo', 'Changelog'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Security'],
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
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-text-primary font-bold text-xl tracking-tight">GymOS</span>
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
                    <a
                      href="#"
                      className="text-text-muted hover:text-text-secondary transition-colors duration-300 text-sm"
                    >
                      {link}
                    </a>
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
            &copy; {new Date().getFullYear()} GymOS. All rights reserved.
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
