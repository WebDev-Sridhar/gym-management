import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../lib/constants/routes'
import Button from '../ui/Button'
import DashboardMockup from '../ui/DashboardMockup'
import ScrollReveal, { fadeUp } from '../ui/ScrollReveal'

function FloatingChip({ className, delay, children }) {
  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay }}
      className={`absolute hidden lg:flex items-center gap-2 rounded-xl bg-white border border-gray-100 shadow-lg shadow-gray-200/70 px-3 py-2 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60rem] h-[40rem] bg-gradient-to-br from-indigo-100 via-violet-50 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <ScrollReveal variant={fadeUp}>
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-600 mb-6"
            >
              <Sparkles size={14} />
              The all-in-one gym operating system
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 leading-[1.1]">
              Run Your Entire Gym <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">From One Platform</span>
            </h1>

            <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-lg">
              Memberships, attendance, payments, trainers, analytics, and mobile access — all in one system. Built for modern gyms that want to grow without the spreadsheets.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={ROUTES.AUTH.SIGNUP}>
                <Button size="lg">
                  Get Started Free
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <a href="#showcase">
                <Button size="lg" variant="secondary">
                  See it in action
                </Button>
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-gray-400">
              <span>No credit card required</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>Setup in minutes</span>
            </div>
          </ScrollReveal>

          <div className="relative">
            <ScrollReveal variant={fadeUp} delay={0.15}>
              <DashboardMockup />
            </ScrollReveal>

            <FloatingChip className="-top-6 -left-10" delay={0}>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-sm">✓</div>
              <div>
                <div className="text-xs font-semibold text-gray-900">Payment received</div>
                <div className="text-[10px] text-gray-400">₹2,500 · UPI</div>
              </div>
            </FloatingChip>

            <FloatingChip className="-bottom-8 -right-6" delay={1.2}>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-sm">📈</div>
              <div>
                <div className="text-xs font-semibold text-gray-900">Retention up</div>
                <div className="text-[10px] text-gray-400">+18% this month</div>
              </div>
            </FloatingChip>
          </div>
        </div>
      </div>
    </section>
  )
}
