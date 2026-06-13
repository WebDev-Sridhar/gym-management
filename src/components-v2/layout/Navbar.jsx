import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { ROUTES } from '../../lib/constants/routes'
import Button from '../ui/Button'

const LINKS = [
  { label: 'Features', to: ROUTES.V2.FEATURES },
  { label: 'Pricing', to: ROUTES.V2.PRICING },
  { label: 'Demo', to: ROUTES.V2.DEMO },
  { label: 'About', to: ROUTES.V2.ABOUT },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 24)
  })

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to={ROUTES.V2.HOME} className="flex items-center gap-2">
          <div className="w-12 h-auto flex items-center justify-center">
            <img src="/logo.png" alt="Gymmobius logo" className="w-full h-auto" />
          </div>
          <span className="font-semibold text-gray-900 text-lg">Gymmobius</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to={ROUTES.AUTH.LOGIN} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
            Login
          </Link>
          <Link to={ROUTES.AUTH.SIGNUP}>
            <Button size="md">Get Started</Button>
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="md:hidden p-2 text-gray-700"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {link.label}
                </Link>
              ))}
              <Link to={ROUTES.AUTH.LOGIN} onClick={() => setMobileOpen(false)} className="text-sm font-medium text-gray-600">
                Login
              </Link>
              <Link to={ROUTES.AUTH.SIGNUP} onClick={() => setMobileOpen(false)}>
                <Button size="md" className="w-full">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
