import { Link } from 'react-router-dom'
import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../components-v2/ui/ScrollReveal'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { CHANGELOG_CONTENT } from '../lib/content/changelog'
import { mapChangelogData } from '../lib/mappers/marketingMapper'
import { ROUTES } from '../lib/constants/routes'

const TAG_STYLES = {
  New: 'bg-indigo-50 text-indigo-600',
  Improved: 'bg-sky-50 text-sky-600',
  Fixed: 'bg-emerald-50 text-emerald-600',
}

function parseChange(change) {
  const match = change.match(/^(New|Improved|Fixed):\s*(.+)$/)
  if (!match) return { tag: null, text: change }
  return { tag: match[1], text: match[2] }
}

export default function ChangelogPageV2() {
  usePageTracking('changelog_v2')
  const data = mapChangelogData(CHANGELOG_CONTENT)

  const totalChanges = data.entries.reduce((sum, entry) => sum + entry.changes.length, 0)

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.CHANGELOG }}>
      <PageHero eyebrow="Changelog" title={data.hero.title} subtitle={data.hero.subtitle} />

      {/* Quick stats */}
      <SectionContainer background="white" innerClassName="!pt-0 !pb-12">
        <StaggerGroup className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
          {[
            { value: data.entries.length, label: 'Releases shipped' },
            { value: totalChanges, label: 'Improvements logged' },
            { value: 'Monthly', label: 'Release cadence' },
          ].map((stat) => (
            <StaggerItem key={stat.label} variant={fadeUp}>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="mt-1 text-xs text-gray-500">{stat.label}</div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      {/* Timeline */}
      <SectionContainer background="gray">
        <div className="max-w-2xl mx-auto space-y-10">
          {data.entries.map((entry) => (
            <ScrollReveal key={entry.version} variant={fadeUp} className="relative pl-8 border-l border-gray-200">
              <span className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-white" />
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-semibold text-gray-900">{entry.version}</h3>
                  <span className="text-sm text-gray-400">{entry.date}</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  {entry.changes.map((change) => {
                    const { tag, text } = parseChange(change)
                    return (
                      <li key={change} className="flex items-start gap-3">
                        {tag && (
                          <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 mt-0.5 ${TAG_STYLES[tag] || 'bg-gray-50 text-gray-500'}`}>
                            {tag}
                          </span>
                        )}
                        <span>{text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </SectionContainer>

      {/* CTA */}
      <SectionContainer background="white">
        <ScrollReveal variant={scaleIn} className="text-center max-w-2xl mx-auto">
          <Eyebrow>Have an idea?</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            We ship what gym owners actually ask for
          </h2>
          <p className="mt-4 text-gray-500">
            Most items on this changelog started as a message from a gym owner. If something's missing, tell us.
          </p>
          <Link to={ROUTES.V2.CONTACT} className="inline-block mt-8">
            <Button size="lg">Send us a request</Button>
          </Link>
        </ScrollReveal>
      </SectionContainer>
    </V2PageShell>
  )
}
