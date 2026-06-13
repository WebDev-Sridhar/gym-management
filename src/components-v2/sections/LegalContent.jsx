import SectionContainer from '../ui/SectionContainer'
import ScrollReveal, { fadeUp } from '../ui/ScrollReveal'

// Shared body for legal pages (privacy, terms, security, refund policy) —
// sticky section nav on desktop, meta line, and a readable column of sections.
export default function LegalContent({ intro, meta, sections }) {
  return (
    <SectionContainer background="white" innerClassName="!py-0 !pb-24">
      <div className="grid lg:grid-cols-[240px_1fr] gap-12 max-w-5xl mx-auto">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 space-y-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-gray-500 hover:text-indigo-600 transition-colors leading-relaxed"
              >
                {s.heading}
              </a>
            ))}
          </nav>
        </aside>

        <div>
          <ScrollReveal variant={fadeUp}>
            <p className="text-xs text-gray-400 mb-8">
              Effective {meta.effectiveDate} · Last updated {meta.lastUpdated} · Version {meta.version} · {meta.jurisdiction}
            </p>
            <p className="text-gray-600 leading-relaxed mb-12">{intro}</p>
          </ScrollReveal>

          <div className="space-y-10">
            {sections.map((section) => (
              <ScrollReveal key={section.id} variant={fadeUp} as="div" id={section.id} className="scroll-mt-28">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.heading}</h2>
                <p className="text-gray-600 leading-relaxed text-sm">{section.body}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}
