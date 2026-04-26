import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'

export default function RefundPolicyPage() {
  return (
    <MarketingLayout>
      <SectionWrapper>

        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold text-text-primary mb-6">
            Refund Policy
          </h1>

          <p className="text-text-muted mb-6">
            This Refund Policy outlines how refunds are handled for subscriptions
            and payments made on Gymmobius.
          </p>

          <div className="space-y-6 text-text-secondary text-sm leading-relaxed">

            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Subscription Payments
              </h3>
              <p>
                All subscription payments are billed in advance on a monthly or
                yearly basis and are non-refundable once the billing cycle begins.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Free Trial
              </h3>
              <p>
                If a free trial is offered, users can evaluate the service before
                making a payment. No refunds will be issued after a paid plan is activated.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Exceptional Cases
              </h3>
              <p>
                Refunds may be considered in exceptional situations such as duplicate
                transactions or technical errors. These will be reviewed on a case-by-case basis.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Cancellation
              </h3>
              <p>
                You may cancel your subscription at any time. However, cancellation
                will not result in a refund for the current billing cycle. Access will
                continue until the end of the paid period.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-text-primary mb-2">
                Contact for Refunds
              </h3>
              <p>
                To request a refund under eligible conditions, please contact us
                with your payment details and reason for the request.
              </p>
            </div>

          </div>
        </div>

      </SectionWrapper>
    </MarketingLayout>
  )
}