import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, ArrowRight, MessageCircle, MapPin, UserCheck, Sparkles } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn, slideInLeft, slideInRight } from '../components-v2/ui/ScrollReveal'
import { PanelShell, ProgressRow } from '../components-v2/ui/Panel'
import StatsStrip from '../components-v2/sections/StatsStrip'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { ABOUT_CONTENT } from '../lib/content/about'
import { mapAboutData } from '../lib/mappers/marketingMapper'
import { WHY_GYMMOBIUS } from '../lib/constants'
import { ROUTES } from '../lib/constants/routes'

const PRINCIPLE_ICONS = [MessageCircle, MapPin, UserCheck, Sparkles]

function ReplacedToolsVisual() {
  const tools = ['Paper registers', 'Excel spreadsheets', 'WhatsApp reminder chaos', 'Separate payment tracker']
  return (
    <PanelShell gradient="bg-rose-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What gyms used before</span>
      <div className="mt-4 space-y-2">
        {tools.map((tool, i) => (
          <motion.div
            key={tool}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3"
          >
            <span className="w-6 h-6 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center flex-shrink-0">
              <X size={12} />
            </span>
            <span className="text-sm text-gray-500 line-through">{tool}</span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-4 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4 text-white shadow-lg shadow-indigo-200 flex items-center justify-between"
      >
        <span className="text-sm font-semibold">One Gymmobius dashboard</span>
        <ArrowRight size={18} />
      </motion.div>
    </PanelShell>
  )
}

function OwnerTimeVisual() {
  return (
    <PanelShell gradient="bg-sky-200">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Where an owner's time goes</span>
      <div className="mt-4 space-y-3">
        <ProgressRow label="Admin & chasing payments — today" value={55} color="bg-rose-400" />
        <ProgressRow label="Admin & chasing payments — with Gymmobius" value={15} color="bg-indigo-500" />
        <ProgressRow label="Members, training, growth — with Gymmobius" value={85} color="bg-emerald-500" />
      </div>
      <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
        The goal isn't more dashboards — it's fewer hours spent running the business so you can spend them running the gym.
      </div>
    </PanelShell>
  )
}

export default function AboutPageV2() {
  usePageTracking('about_v2')
  const data = mapAboutData(ABOUT_CONTENT)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.ABOUT }}>
      <PageHero eyebrow={data.hero.eyebrow} title={data.hero.title} subtitle={data.hero.subtitle} />

      <StatsStrip background="gray" />

      {/* Mission */}
      <SectionContainer background="white">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <ScrollReveal variant={slideInLeft}>
            <Eyebrow>{data.mission.title}</Eyebrow>
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
              Every gym owner deserves enterprise-grade tooling
            </h2>
            <p className="mt-4 text-base text-gray-500 leading-relaxed">{data.mission.body}</p>
          </ScrollReveal>
          <ScrollReveal variant={slideInRight} delay={0.1}>
            <ReplacedToolsVisual />
          </ScrollReveal>
        </div>

        {/* Vision */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mt-24 sm:mt-32">
          <ScrollReveal variant={slideInRight} className="lg:order-2">
            <Eyebrow>{data.vision.title}</Eyebrow>
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
              Software that runs quietly in the background
            </h2>
            <p className="mt-4 text-base text-gray-500 leading-relaxed">{data.vision.body}</p>
          </ScrollReveal>
          <ScrollReveal variant={slideInLeft} className="lg:order-1" delay={0.1}>
            <OwnerTimeVisual />
          </ScrollReveal>
        </div>
      </SectionContainer>

      {/* Principles */}
      <SectionContainer background="gray">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              How we build Gymmobius
            </h2>
          </ScrollReveal>
        </div>
        <StaggerGroup className="grid sm:grid-cols-2 gap-6">
          {WHY_GYMMOBIUS.map((item, i) => {
            const Icon = PRINCIPLE_ICONS[i % PRINCIPLE_ICONS.length]
            return (
              <StaggerItem key={item.title} variant={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </StaggerItem>
            )
          })}
        </StaggerGroup>
      </SectionContainer>

      {/* CTA */}
      <SectionContainer background="white">
        <ScrollReveal variant={scaleIn} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-16 sm:px-16 sm:py-20 text-center max-w-5xl mx-auto">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              See it for your gym
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">
              30 minutes with our team, your member data in a sandbox — no slideware, no sales pressure.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to={ROUTES.V2.DEMO}>
                <Button size="lg" variant="secondary">Book a demo</Button>
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
