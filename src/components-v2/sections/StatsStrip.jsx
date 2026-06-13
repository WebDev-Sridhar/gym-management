import SectionContainer from '../ui/SectionContainer'
import { StaggerGroup, StaggerItem, fadeUp } from '../ui/ScrollReveal'
import AnimatedCounter from '../ui/AnimatedCounter'

const DEFAULT_STATS = [
  { value: 10000, suffix: '+', label: 'Members managed' },
  { value: 500000, suffix: '+', label: 'Check-ins recorded' },
  { value: 99.9, suffix: '%', decimals: 1, label: 'Platform uptime' },
  { value: 120, suffix: '+', label: 'Gyms onboarded' },
]

export default function StatsStrip({ stats = DEFAULT_STATS, background = 'white' }) {
  return (
    <SectionContainer background={background} innerClassName="!py-12 sm:!py-16">
      <StaggerGroup className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <StaggerItem key={stat.label} variant={fadeUp} className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900">
              <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
            </div>
            <div className="mt-2 text-sm text-gray-500">{stat.label}</div>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </SectionContainer>
  )
}
