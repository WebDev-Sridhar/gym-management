import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function ContactPage() {
  return (
    <MarketingLayout>
    <SectionWrapper>

      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-text-primary">Contact Us</h1>
        <p className="text-text-secondary mt-4">
          Have questions? We’d love to hear from you.
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">

        <input
          type="text"
          placeholder="Your Name"
          className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary"
        />

        <input
          type="email"
          placeholder="Your Email"
          className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary"
        />

        <textarea
          placeholder="Your Message"
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-bg-elevated border border-border text-text-primary"
        />

        <button className="w-full py-3 bg-accent-purple text-white rounded-xl font-semibold">
          Send Message
        </button>

      </div>

    </SectionWrapper>
    </MarketingLayout>
  )
}