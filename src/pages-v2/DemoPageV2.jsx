import { Link } from 'react-router-dom'
import { ArrowRight, PhoneCall, Database, MonitorPlay } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../components-v2/ui/ScrollReveal'
import DashboardMockup from '../components-v2/ui/DashboardMockup'
import MobileMockup from '../components-v2/ui/MobileMockup'
import StatsStrip from '../components-v2/sections/StatsStrip'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { DEMO_CONTENT } from '../lib/content/demo'
import { mapDemoData } from '../lib/mappers/marketingMapper'
import { ROUTES } from '../lib/constants/routes'

const STEPS = [
  {
    icon: PhoneCall,
    title: 'Book a 30-minute call',
    description: 'Pick a time that works for you. No forms to fill out beyond your contact details — a real person from our team will join.',
  },
  {
    icon: Database,
    title: 'We set up your sandbox',
    description: "Tell us a bit about your gym — member count, plans, branches — and we'll configure a sandbox that mirrors your setup.",
  },
  {
    icon: MonitorPlay,
    title: 'Live walkthrough, your data',
    description: 'See check-ins, renewals, the owner dashboard, and the member app working with numbers that look like yours — not a generic demo script.',
  },
]

export default function DemoPageV2() {
  usePageTracking('demo_v2')
  const data = mapDemoData(DEMO_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.DEMO }}>
      {/* Hero */}
      {/* <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white pt-36 pb-16 sm:pt-44 sm:pb-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>Demo</Eyebrow>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900">
              {data.hero.title}
            </h1>
            <p className="mt-6 text-base sm:text-lg text-gray-500 leading-relaxed max-w-xl">
              {data.hero.subtitle}
            </p>
            {data.cta && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to={data.cta.to}>
                  <Button size="lg">
                    {data.cta.label} <ArrowRight size={18} />
                  </Button>
                </Link>
                <Link to={ROUTES.AUTH.SIGNUP}>
                  <Button size="lg" variant="secondary">Start free trial instead</Button>
                </Link>
              </div>
            )}
          </ScrollReveal>

          <ScrollReveal variant={scaleIn} delay={0.1}>
            <DashboardMockup className="mx-auto" />
          </ScrollReveal>
        </div>
      </section> */}

      {/* What to expect */}
      <SectionContainer background="gray">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>What to expect</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              No slideware, no sales pressure
            </h2>
            <p className="mt-4 text-base sm:text-lg text-gray-500 leading-relaxed">
              Three simple steps between booking and seeing Gymmobius run with your gym's numbers.
            </p>
          </ScrollReveal>
        </div>
        <StaggerGroup className="grid sm:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <StaggerItem key={step.title} variant={fadeUp} className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <span className="absolute top-6 right-6 text-4xl font-bold text-gray-100">{i + 1}</span>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </SectionContainer>

      {/* See both sides */}
      <SectionContainer background="white">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>Two views, one platform</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              What you'll see in the walkthrough
            </h2>
          </ScrollReveal>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal variant={fadeUp}>
            <DashboardMockup className="mx-auto" />
            <div className="text-center mt-6">
              <h3 className="text-lg font-semibold text-gray-900">Your owner dashboard</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Revenue, attendance, retention, and trainer load — populated with figures shaped like your gym's.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal variant={fadeUp} delay={0.1}>
            <MobileMockup className="mx-auto" />
            <div className="text-center mt-6">
              <h3 className="text-lg font-semibold text-gray-900">The member app</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                What your members open every day — check-in, membership status, schedules, and renewals.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </SectionContainer>

      <StatsStrip background="gray" />

      {/* CTA */}
      <SectionContainer background="white">
        <ScrollReveal variant={scaleIn} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-16 sm:px-16 sm:py-20 text-center max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Ready to see your gym in Gymmobius?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">
              30 minutes. Your data. No pressure to buy on the call.
            </p>
            {data.cta && (
              <Link to={ROUTES.V2.CONTACT}  className="inline-block mt-8">
                <Button size="lg" variant="secondary">{data.cta.label}</Button>
              </Link>
            )}
          </div>
        </ScrollReveal>
      </SectionContainer>
    </V2PageShell>
  )
}
