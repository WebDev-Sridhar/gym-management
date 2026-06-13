import { Star } from 'lucide-react'
import SectionContainer, { Eyebrow } from '../ui/SectionContainer'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../ui/ScrollReveal'
import AnimatedCounter from '../ui/AnimatedCounter'

const STATS = [
  { value: 10000, suffix: '+', label: 'Members managed' },
  { value: 500000, suffix: '+', label: 'Check-ins recorded' },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Platform uptime' },
  { value: 120, suffix: '+', label: 'Gyms onboarded' },
]

const TESTIMONIALS = [
  {
    quote: 'Gymmobius replaced four different tools we were juggling. Renewals, attendance, and payments now run themselves — our front desk finally has time to actually talk to members.',
    name: 'Arjun Mehta',
    role: 'Owner, Iron Paradise',
  },
  {
    quote: 'The WhatsApp reminders alone cut our missed renewals by half. Members get a friendly nudge before they even realize their plan is expiring.',
    name: 'Priya Raman',
    role: 'Founder, FlexZone Studios',
  },
  {
    quote: 'Managing three branches used to mean three spreadsheets. Now I see everything — revenue, attendance, trainer load — from one screen.',
    name: 'Karthik Subramaniam',
    role: 'Director, PowerHouse Fitness',
  },
]

export default function SocialProof() {
  return (
    <SectionContainer background="white">
      <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        {STATS.map((stat) => (
          <StaggerItem key={stat.label} variant={fadeUp} className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
            </div>
            <div className="mt-2 text-sm text-gray-500">{stat.label}</div>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <ScrollReveal variant={fadeUp}>
          <Eyebrow>Loved by gym owners</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
            Don't just take our word for it
          </h2>
        </ScrollReveal>
      </div>

      <StaggerGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <StaggerItem key={t.name} variant={scaleIn} className="rounded-2xl bg-gray-50 border border-gray-100 p-6 flex flex-col">
            <div className="flex gap-1 text-amber-400 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">"{t.quote}"</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                {t.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">{t.role}</div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </SectionContainer>
  )
}
