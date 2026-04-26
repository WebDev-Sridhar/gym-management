import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function TermsPage() {
  return (
    <MarketingLayout>
      <SectionWrapper>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-text-primary mb-6">
            Terms of Service
          </h1>

          <p className="text-text-muted mb-6">
            By using Gymmobius, you agree to the following terms.
          </p>

          <div className="space-y-6 text-text-secondary text-sm leading-relaxed">

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Use of Service</h3>
              <p>
                You agree to use the platform only for lawful purposes related
                to managing your gym operations.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Account Responsibility</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Payments</h3>
              <p>
                Subscription fees are billed as per your selected plan.
                No refunds unless explicitly stated.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Termination</h3>
              <p>
                We reserve the right to suspend or terminate accounts for misuse.
              </p>
            </div>

          </div>
        </div>

      </SectionWrapper>
    </MarketingLayout>
  )
}