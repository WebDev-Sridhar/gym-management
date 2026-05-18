import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { BLOG_CONTENT } from '../../lib/content/blog'
import { mapBlogData } from '../../lib/mappers/marketingMapper'

export default function BlogPage() {
  usePageTracking('blog')
  const data = mapBlogData(BLOG_CONTENT)

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

          <div className="grid md:grid-cols-2 gap-6">
            {data.posts.map((post) => (
              <article key={post.slug || post.title} className="border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-text-primary">{post.title}</h3>
                <p className="text-text-muted mt-2">{post.excerpt}</p>
              </article>
            ))}
          </div>

        </SectionWrapper>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
