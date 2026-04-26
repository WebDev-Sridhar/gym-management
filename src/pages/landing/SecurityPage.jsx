import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <SectionWrapper>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-text-primary mb-6">
            Security
          </h1>

          <p className="text-text-muted mb-6">
            We take security seriously to protect your data and your members.
          </p>

          <div className="space-y-6 text-text-secondary text-sm leading-relaxed">

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Data Protection</h3>
              <p>
                All data is securely stored using modern cloud infrastructure
                with strict access control.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Authentication</h3>
              <p>
                Secure authentication mechanisms including OTP verification
                are used to protect user accounts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Payments Security</h3>
              <p>
                Payments are handled via trusted gateways like Razorpay.
                We do not store card details.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">Infrastructure</h3>
              <p>
                Built on secure platforms like Supabase with row-level security (RLS)
                to ensure strict data isolation between gyms.
              </p>
            </div>

          </div>
        </div>

      </SectionWrapper>
    </MarketingLayout>
  )
}