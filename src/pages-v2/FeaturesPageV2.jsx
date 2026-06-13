import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode, CreditCard, BarChart3, Users, Check, ArrowRight, ScanLine, Wallet, TrendingUp } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn, slideInLeft, slideInRight } from '../components-v2/ui/ScrollReveal'
import { PanelShell, ProgressRow } from '../components-v2/ui/Panel'
import DashboardMockup from '../components-v2/ui/DashboardMockup'
import StatsStrip from '../components-v2/sections/StatsStrip'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { FEATURES_CONTENT } from '../lib/content/features'
import { mapFeaturesData } from '../lib/mappers/marketingMapper'
import { ROUTES } from '../lib/constants/routes'

const FEATURE_ICONS = {
  qrCode: QrCode,
  creditCard: CreditCard,
  chartBar: BarChart3,
  users: Users,
}

const FEATURE_POINTS = {
  qrCode: ['QR check-in at the gate', 'Live attendance feed for every branch', 'Automatic trainer-assignment updates', 'Daily footfall reports, no paper logs'],
  creditCard: ['WhatsApp payment links on renewal', 'Smart retries on failed payments', 'Real-time Razorpay reconciliation', 'Clean ledger, ready for your CA'],
  chartBar: ['Revenue & growth trends by month', 'Retention and churn by cohort', 'Ghost-member alerts before they cancel', 'Trainer-level performance breakdown'],
  users: ['Assign members & track plans', 'Log sessions and attendance per trainer', 'Per-branch trainer dashboards', 'Owner visibility, zero micromanaging'],
}

function CheckInVisual() {
  const checkins = [
    { name: 'Rahul M.', time: '6:04 AM', plan: 'Pro Annual' },
    { name: 'Anita S.', time: '6:11 AM', plan: 'Standard' },
    { name: 'Dev K.', time: '6:18 AM', plan: 'Day Pass' },
  ]
  return (
    <PanelShell gradient="bg-indigo-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live check-ins</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-1">
          <ScanLine size={12} /> Avg scan 1.8s
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {checkins.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                {c.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700">{c.name}</div>
                <div className="text-[10px] text-gray-400">{c.plan}</div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-gray-900">{c.time}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Today's check-ins</span>
        <span className="text-sm font-bold text-gray-900">214</span>
      </div>
    </PanelShell>
  )
}

function RenewalFunnelVisual() {
  return (
    <PanelShell gradient="bg-amber-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Renewal funnel</span>
      <div className="mt-4 space-y-3">
        <ProgressRow label="Reminder sent" value={100} color="bg-indigo-400" />
        <ProgressRow label="Payment link opened" value={76} color="bg-violet-400" />
        <ProgressRow label="Paid" value={64} color="bg-emerald-500" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-lg shadow-emerald-200 flex items-center justify-between"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-100">Payment received</div>
          <div className="text-lg font-bold mt-1">₹2,500 via UPI</div>
        </div>
        <Wallet size={28} className="opacity-80" />
      </motion.div>
    </PanelShell>
  )
}

function RetentionVisual() {
  return (
    <PanelShell gradient="bg-sky-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Retention by cohort</span>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">New members</div>
          <div className="text-xl font-bold text-gray-900 mt-1">+128</div>
          <div className="text-[10px] text-emerald-500 font-semibold mt-1 flex items-center gap-1"><TrendingUp size={11} /> 22% MoM</div>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Ghost-member alerts</div>
          <div className="text-xl font-bold text-gray-900 mt-1">7</div>
          <div className="text-[10px] text-amber-500 font-semibold mt-1">flagged this week</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <ProgressRow label="30-day retention" value={91} color="bg-sky-500" />
        <ProgressRow label="90-day retention" value={78} color="bg-indigo-500" />
      </div>
    </PanelShell>
  )
}

function TrainerLoadVisual() {
  return (
    <PanelShell gradient="bg-violet-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trainer workload — this week</span>
      <div className="mt-4 space-y-3">
        <ProgressRow label="Coach Dev · 18 sessions" value={82} color="bg-indigo-500" />
        <ProgressRow label="Coach Anita · 14 sessions" value={68} color="bg-violet-500" />
        <ProgressRow label="Coach Rahul · 21 sessions" value={95} color="bg-fuchsia-500" />
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
        Sessions auto-balance across branches as new members are assigned.
      </div>
    </PanelShell>
  )
}

const FEATURE_VISUALS = {
  qrCode: CheckInVisual,
  creditCard: RenewalFunnelVisual,
  chartBar: RetentionVisual,
  users: TrainerLoadVisual,
}

const STEPS = [
  {
    title: 'Set up in minutes',
    description: 'Import your member list, configure plans and pricing, and your branded dashboard and member app are ready — no IT team required.',
  },
  {
    title: 'Members check in & pay',
    description: 'QR check-ins at the gate, WhatsApp renewal links, and a member app that handles the rest — front desk stays free for actual conversations.',
  },
  {
    title: 'You get the full picture',
    description: 'Revenue, attendance, retention, and trainer performance update in real time — one dashboard, every branch, no spreadsheets.',
  },
]

function FeatureRow({ feature, index }) {
  const Icon = FEATURE_ICONS[feature.iconKey]
  const Visual = FEATURE_VISUALS[feature.iconKey]
  const points = FEATURE_POINTS[feature.iconKey] || []
  const reversed = index % 2 === 1

  return (
    <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${index !== 0 ? 'mt-24 sm:mt-32' : ''}`}>
      <ScrollReveal variant={reversed ? slideInRight : slideInLeft} className={reversed ? 'lg:order-2' : ''}>
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
          {Icon && <Icon size={22} />}
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">{feature.title}</h2>
        <p className="mt-4 text-base text-gray-500 leading-relaxed">{feature.description}</p>
        <ul className="mt-6 space-y-2.5">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-3 text-sm text-gray-700">
              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Check size={12} />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </ScrollReveal>

      <ScrollReveal variant={reversed ? slideInLeft : slideInRight} className={reversed ? 'lg:order-1' : ''} delay={0.1}>
        {Visual && <Visual />}
      </ScrollReveal>
    </div>
  )
}

export default function FeaturesPageV2() {
  usePageTracking('features_v2')
  const data = mapFeaturesData(FEATURES_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.FEATURES }}>
      {/* Hero */}
      {/* <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white pt-36 pb-16 sm:pt-44 sm:pb-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>Features</Eyebrow>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900">
              {data.hero.title}
            </h1>
            <p className="mt-6 text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl">
              {data.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={ROUTES.AUTH.SIGNUP}>
                <Button size="lg">
                  Get Started Free <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to={ROUTES.V2.DEMO}>
                <Button size="lg" variant="secondary">Book a demo</Button>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal variant={scaleIn} delay={0.1}>
            <DashboardMockup className="mx-auto" />
          </ScrollReveal>
        </div>
      </section> */}

      {/* How it works */}
      <SectionContainer background="gray">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              From sign-up to insight, in three steps
            </h2>
          </ScrollReveal>
        </div>
        <StaggerGroup className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title} variant={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <span className="inline-flex w-9 h-9 rounded-full bg-indigo-600 text-white items-center justify-center text-sm font-bold">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      {/* Alternating feature rows */}
      <SectionContainer background="white">
        {data.features.map((feature, index) => (
          <FeatureRow key={feature.title} feature={feature} index={index} />
        ))}
      </SectionContainer>

      <StatsStrip background="gray" />

      {data.cta && (
        <SectionContainer background="white">
          <ScrollReveal variant={scaleIn} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-16 sm:px-16 sm:py-20 text-center max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">{data.cta.title}</h2>
              <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">{data.cta.subtitle}</p>
              <Link to={data.cta.to} className="inline-block mt-8">
                <Button size="lg" variant="secondary">{data.cta.label}</Button>
              </Link>
            </div>
          </ScrollReveal>
        </SectionContainer>
      )}
    </V2PageShell>
  )
}
