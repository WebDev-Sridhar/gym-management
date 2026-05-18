import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { TERMS_CONTENT } from '../../lib/content/legal/terms'
import { mapTermsData } from '../../lib/mappers/legalMapper'

export default function TermsPage() {
  usePageTracking('terms')
  const data = mapTermsData(TERMS_CONTENT)

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <SectionWrapper>

          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-extrabold text-text-primary mb-6">
              {data.title}
            </h1>

            <p className="text-text-muted mb-6">
              {data.intro}
            </p>

            <p className="text-xs text-text-muted mb-10">
              Effective: {data.meta.effectiveDate} · Last updated: {data.meta.lastUpdated} · Version {data.meta.version} · Jurisdiction: {data.meta.jurisdiction}
            </p>

            <div className="space-y-6 text-text-secondary text-sm leading-relaxed">
              {data.sections.map((section) => (
                <div key={section.id} id={section.id}>
                  <h3 className="font-semibold text-text-primary mb-2">{section.heading}</h3>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
          </div>

        </SectionWrapper>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
