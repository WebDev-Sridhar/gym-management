import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <SectionWrapper>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-text-primary mb-6">
            Privacy Policy
          </h1>

          <p className="text-text-muted mb-6">
            We value your privacy and are committed to protecting your data.
          </p>

          <div className="space-y-6 text-text-secondary text-sm leading-relaxed">

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Information We Collect</h3>
              <p>
                We collect information such as your name, email, phone number,
                and gym-related data to provide and improve our services.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">How We Use Data</h3>
              <p>
                Your data is used to operate the platform, process payments,
                send notifications, and improve user experience.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Data Security</h3>
              <p>
                We implement industry-standard security practices to protect your data.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Third-Party Services</h3>
              <p>
                We may use trusted services like payment gateways and messaging APIs
                to deliver core features.
              </p>
            </div>

          </div>
        </div>

      </SectionWrapper>
    </MarketingLayout>
  )
}