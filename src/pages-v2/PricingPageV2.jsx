import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Sparkles, QrCode, Smartphone, LayoutDashboard, CreditCard, MessageCircle, Globe } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../components-v2/ui/ScrollReveal'
import StatsStrip from '../components-v2/sections/StatsStrip'
import FAQ from '../components-v2/sections/FAQ'
import WhatsAppCTA from '../components/ui/WhatsAppCTA'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { PRICING_CONTENT } from '../lib/content/pricing'
import { mapPricingData } from '../lib/mappers/marketingMapper'
import { fetchFounderSlotsUsed } from '../services/subscriptionService'
import { ROUTES } from '../lib/constants/routes'

const FOUNDER_TOTAL_SLOTS = 25 // KEEP IN SYNC with create-subscription-order FOUNDER_PRICING_SLOTS

const TRUST_PILLS = ['30-day free trial', 'No setup fees', 'Cancel anytime']

const INCLUDED = [
  { icon: QrCode, label: 'QR attendance tracking' },
  { icon: Smartphone, label: 'Branded member app' },
  { icon: LayoutDashboard, label: 'Owner dashboard & analytics' },
  { icon: CreditCard, label: 'Razorpay-powered payments' },
  { icon: MessageCircle, label: 'WhatsApp reminders' },
  { icon: Globe, label: 'Multi-page gym website' },
]

// Yearly = ~2 months free (≈17% off), shown alongside the monthly price.
function yearlyPrice(monthlyPrice) {
  const numeric = Number(monthlyPrice.replace(/[^0-9]/g, ''))
  const yearly = Math.round((numeric * 10) / 12)
  return `₹${yearly.toLocaleString('en-IN')}`
}

export default function PricingPageV2() {
  usePageTracking('pricing_v2')
  const data = mapPricingData(PRICING_CONTENT)
  const [yearly, setYearly] = useState(false)

  const [founderSlotsUsed, setFounderSlotsUsed] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetchFounderSlotsUsed().then((n) => {
      if (!cancelled) setFounderSlotsUsed(n)
    })
    return () => { cancelled = true }
  }, [])

  const founderSlotsLeft = founderSlotsUsed != null
    ? Math.max(0, FOUNDER_TOTAL_SLOTS - founderSlotsUsed)
    : null
  const founderSlotsFull = founderSlotsLeft === 0

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.PRICING }}>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <ScrollReveal variant={fadeUp} className="flex flex-col items-center gap-5">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900">
              {data.hero.title}
            </h1>
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl">
              {data.hero.subtitle}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {TRUST_PILLS.map((pill) => (
                <span key={pill} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
                  <Check size={12} className="text-emerald-500" /> {pill}
                </span>
              ))}
            </div>

            {!founderSlotsFull && (
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-2 text-sm font-medium text-indigo-600"
              >
                <Sparkles size={16} />
                <span>
                  Founder pricing — first {FOUNDER_TOTAL_SLOTS} customers get <strong>50% off for 6 months</strong>
                  {founderSlotsLeft != null && (
                    <> · {founderSlotsLeft} {founderSlotsLeft === 1 ? 'spot' : 'spots'} left</>
                  )}
                </span>
              </motion.div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Everything included */}
      <SectionContainer background="white" innerClassName="!pt-0">
        <ScrollReveal variant={fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Every plan includes</h2>
          <p className="mt-3 text-gray-500">The core platform — no add-ons, no surprise modules.</p>
        </ScrollReveal>
        <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {INCLUDED.map(({ icon: Icon, label }) => (
            <StaggerItem key={label} variant={fadeUp} className="flex items-center gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-4">
              <span className="w-9 h-9 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Icon size={18} />
              </span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      {/* Plans */}
      <SectionContainer background="gray">
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!yearly ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setYearly((y) => !y)}
            className="relative w-14 h-8 rounded-full transition-colors duration-300"
            style={{ backgroundColor: yearly ? '#6366f1' : '#e5e7eb' }}
            aria-label="Toggle yearly pricing"
          >
            <motion.span
              className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md"
              animate={{ x: yearly ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-gray-900' : 'text-gray-400'}`}>
            Yearly <span className="text-emerald-500 font-semibold">save ~17%</span>
          </span>
        </div>

        <StaggerGroup className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {data.plans.map((plan) => (
            <StaggerItem
              key={plan.name}
              variant={scaleIn}
              className={`relative rounded-3xl p-8 border ${
                plan.highlighted
                  ? 'bg-gray-900 border-gray-900 text-white shadow-2xl shadow-gray-400/30 lg:scale-105'
                  : 'bg-white border-gray-100 shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold px-4 py-1 shadow-lg">
                  Most Popular
                </span>
              )}

              <h3 className={`text-lg font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
              <p className={`mt-2 text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <motion.span
                  key={yearly ? 'yearly' : 'monthly'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}
                >
                  {yearly ? yearlyPrice(plan.price) : plan.price}
                </motion.span>
                <span className={`text-sm ${plan.highlighted ? 'text-gray-300' : 'text-gray-400'}`}>
                  {yearly ? '/month, billed yearly' : plan.period}
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className={`flex items-start gap-3 text-sm ${plan.highlighted ? 'text-gray-200' : 'text-gray-600'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      plan.highlighted ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-500'
                    }`}>
                      <Check size={12} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link to={plan.ctaTo} className="block mt-8">
                <Button size="lg" variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
                  {plan.cta}
                </Button>
              </Link>

              <WhatsAppCTA
                planName={plan.name}
                variant="link"
                className="mt-3 w-full justify-center"
                label={`WhatsApp about ${plan.name}`}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      <StatsStrip />

      <FAQ />

      <SectionContainer background="gray">
        <ScrollReveal variant={scaleIn} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-16 sm:px-16 sm:py-20 text-center max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Still deciding which plan fits?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">
              Tell us about your gym — member count, branches, trainers — and we'll point you to the right plan.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to={ROUTES.V2.CONTACT}>
                <Button size="lg" variant="secondary">Talk to us</Button>
              </Link>
              <Link to={ROUTES.AUTH.SIGNUP}>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  Start free trial
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </SectionContainer>
    </V2PageShell>
  )
}
