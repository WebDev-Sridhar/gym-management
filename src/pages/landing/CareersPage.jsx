import { Link } from 'react-router-dom'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { CAREERS_CONTENT } from '../../lib/content/careers'
import { mapCareersData } from '../../lib/mappers/marketingMapper'

export default function CareersPage() {
  usePageTracking('careers')
  const data = mapCareersData(CAREERS_CONTENT)
  const applyTo = CAREERS_CONTENT.applyTo

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <SectionWrapper>

          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-text-primary">{data.hero.title}</h1>
            <p className="text-text-secondary mt-4">
              {data.hero.subtitle}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {data.jobs.map((job) => (
              <div key={job.id || job.role} className="border border-border rounded-xl p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-text-primary font-bold">{job.role}</h3>
                  <p className="text-text-muted text-sm">{job.location}</p>
                </div>

                <Link
                  to={applyTo}
                  className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:opacity-90 transition"
                  aria-label={`Apply for ${job.role}`}
                >
                  Apply
                </Link>
              </div>
            ))}
          </div>

        </SectionWrapper>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
