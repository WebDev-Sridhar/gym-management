import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import V2PageShell from '../components-v2/layout/V2PageShell'
import PageHero from '../components-v2/ui/PageHero'
import SectionContainer, { Eyebrow } from '../components-v2/ui/SectionContainer'
import Button from '../components-v2/ui/Button'
import ScrollReveal, { StaggerGroup, StaggerItem, fadeUp, scaleIn } from '../components-v2/ui/ScrollReveal'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { BLOG_CONTENT } from '../lib/content/blog'
import { mapBlogData } from '../lib/mappers/marketingMapper'
import { ROUTES } from '../lib/constants/routes'

const CATEGORY_RULES = [
  { match: /churn|ghost|90-days/, label: 'Retention' },
  { match: /pricing/, label: 'Pricing' },
  { match: /whatsapp/, label: 'Automation' },
  { match: /trainer/, label: 'Team' },
  { match: /website|conversion/, label: 'Marketing' },
]

function categorize(slug = '') {
  const found = CATEGORY_RULES.find((rule) => rule.match.test(slug))
  return found ? found.label : 'Playbook'
}

export default function BlogPageV2() {
  usePageTracking('blog_v2')
  const data = mapBlogData(BLOG_CONTENT)
  const [featured, ...rest] = data.posts

  return (
    <V2PageShell seo={{ ...data.seo, canonical: ROUTES.V2.BLOG }}>
      <PageHero eyebrow="Blog" title={data.hero.title} subtitle={data.hero.subtitle} />

      {featured && (
        <SectionContainer background="white" innerClassName="!pt-0">
          <ScrollReveal variant={scaleIn} className="relative rounded-3xl bg-gray-900 text-white p-8 sm:p-12 lg:p-16 overflow-hidden max-w-5xl mx-auto">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                Latest · {categorize(featured.slug)}
              </span>
              <h2 className="mt-5 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-snug">
                {featured.title}
              </h2>
              <p className="mt-4 text-gray-300 leading-relaxed">{featured.excerpt}</p>
              <span className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-white/90">
                Read the playbook <ArrowRight size={16} />
              </span>
            </div>
          </ScrollReveal>
        </SectionContainer>
      )}

      <SectionContainer background="gray">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <ScrollReveal variant={fadeUp}>
            <Eyebrow>More from the notebook</Eyebrow>
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              Operational playbooks for gym owners
            </h2>
          </ScrollReveal>
        </div>
        <StaggerGroup className="grid sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {rest.map((post) => (
            <StaggerItem
              key={post.slug || post.title}
              variant={fadeUp}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                {categorize(post.slug)}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 leading-snug">{post.title}</h3>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">{post.excerpt}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </SectionContainer>

      {/* CTA */}
      <SectionContainer background="white">
        <ScrollReveal variant={fadeUp} className="text-center max-w-2xl mx-auto">
          <Eyebrow>Got a topic in mind?</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            We write what gym owners ask about
          </h2>
          <p className="mt-4 text-gray-500">
            Pricing, retention, trainer pay, automation — if you're stuck on something operational, there's a good chance it's our next piece.
          </p>
          <Link to={ROUTES.V2.CONTACT} className="inline-block mt-8">
            <Button size="lg">Suggest a topic</Button>
          </Link>
        </ScrollReveal>
      </SectionContainer>
    </V2PageShell>
  )
}
