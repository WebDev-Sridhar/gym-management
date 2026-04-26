import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

const POSTS = [
  {
    title: 'How to Increase Gym Member Retention',
    excerpt: 'Learn proven strategies to keep your members engaged and loyal.',
  },
  {
    title: 'Why Automation is the Future of Gyms',
    excerpt: 'Save time and scale your operations with smart automation.',
  },
]

export default function BlogPage() {
  return (
    <MarketingLayout>
    <SectionWrapper>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-text-primary">Blog</h1>
        <p className="text-text-secondary mt-4">
          Insights, strategies, and updates for gym owners.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {POSTS.map((post) => (
          <div key={post.title} className="border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-text-primary">{post.title}</h3>
            <p className="text-text-muted mt-2">{post.excerpt}</p>
          </div>
        ))}
      </div>

    </SectionWrapper>
    </MarketingLayout>
  )
}