import { motion } from 'framer-motion'
import { TrendingUp, Users, Zap } from 'lucide-react'
import SectionContainer, { Eyebrow } from '../ui/SectionContainer'
import ScrollReveal, { fadeUp, scaleIn } from '../ui/ScrollReveal'
import MobileMockup from '../ui/MobileMockup'
import AnimatedCounter from '../ui/AnimatedCounter'

// Smooth area-chart path drawn with Framer Motion (no chart library needed).
function RevenueChart() {
  const points = [40, 55, 48, 70, 62, 85, 78, 95, 88, 110, 102, 128]
  const width = 520
  const height = 180
  const step = width / (points.length - 1)
  const max = Math.max(...points)
  const coords = points.map((p, i) => [i * step, height - (p / max) * (height - 20) - 10])
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 sm:h-56" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#revenueFill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />
      {coords.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="4"
          fill="#ffffff"
          stroke="#6366f1"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 + i * 0.06, duration: 0.3 }}
        />
      ))}
    </svg>
  )
}

function HighlightTag({ className, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
      className={`absolute hidden md:flex items-center gap-2 rounded-xl bg-white border border-gray-100 shadow-lg shadow-gray-200/70 px-3 py-2 ${className}`}
    >
      <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
        <Icon size={14} />
      </span>
      <span className="text-xs font-medium text-gray-700">{children}</span>
    </motion.div>
  )
}

export default function ProductShowcase() {
  return (
    <SectionContainer background="gray" id="showcase">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>See it in action</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Show, don't tell
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
            A real look at the dashboards your team and members will use every day.
          </p>
        </ScrollReveal>
      </div>

      {/* Wide analytics panel */}
      <ScrollReveal variant={scaleIn}>
        <div className="relative rounded-3xl bg-white border border-gray-100 shadow-2xl shadow-gray-200/70 p-6 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-6">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Revenue</span>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-bold text-gray-900">
                  <AnimatedCounter prefix="₹" value={8.4} decimals={1} suffix="L" />
                </span>
                <span className="text-sm font-semibold text-emerald-500 flex items-center gap-1">
                  <TrendingUp size={14} /> +24% vs last month
                </span>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-gray-400">Active members</div>
                <div className="text-xl font-bold text-gray-900"><AnimatedCounter value={1284} /></div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Avg. attendance</div>
                <div className="text-xl font-bold text-gray-900"><AnimatedCounter value={91} suffix="%" /></div>
              </div>
            </div>
          </div>

          <RevenueChart />

          <HighlightTag className="top-6 left-10" icon={Zap} delay={0.8}>
            Auto-renewed 42 memberships
          </HighlightTag>
          <HighlightTag className="bottom-10 right-10" icon={Users} delay={1}>
            128 new members this month
          </HighlightTag>
        </div>
      </ScrollReveal>

      {/* Member app spotlight */}
      <div className="mt-16 sm:mt-24 grid lg:grid-cols-2 gap-12 items-center">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>Member experience</Eyebrow>
          <h3 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
            An app your members will actually open
          </h3>
          <p className="mt-4 text-base text-gray-500 leading-relaxed max-w-md">
            Members check in with a tap, see their membership status, view class schedules, and pay renewals — all from their phone. Less front-desk friction, more engaged members.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: 'Self check-ins', value: '78%', desc: 'of total check-ins' },
              { label: 'App rating', value: '4.8★', desc: 'average score' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.desc}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal variant={scaleIn} delay={0.1}>
          <MobileMockup className="mx-auto" />
        </ScrollReveal>
      </div>
    </SectionContainer>
  )
}
