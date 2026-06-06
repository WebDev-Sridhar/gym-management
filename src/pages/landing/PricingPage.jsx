import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sparkles, FileDown } from 'lucide-react'
import SectionWrapper from '../../components/layout/SectionWrapper'
import MarketingLayout from '../../components/layout/MarketingLayout'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import Card from '../../components/ui/Card'
import WhatsAppCTA from '../../components/ui/WhatsAppCTA'
import { fadeUp } from '../../lib/animations'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { PRICING_CONTENT } from '../../lib/content/pricing'
import { mapPricingData } from '../../lib/mappers/marketingMapper'
import { fetchFounderSlotsUsed } from '../../services/subscriptionService'

const FOUNDER_TOTAL_SLOTS = 25     // KEEP IN SYNC with create-subscription-order FOUNDER_PRICING_SLOTS

export default function PricingPage() {
  usePageTracking('pricing')
  const data = mapPricingData(PRICING_CONTENT)

  // V3 Task 8 / 11: live founder-slots counter via the public
  // founder_slots_used() RPC. RPC errors → null → we hide the count
  // rather than show a wrong-looking "0/100".
  const [founderSlotsUsed, setFounderSlotsUsed] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetchFounderSlotsUsed().then(n => {
      if (!cancelled) setFounderSlotsUsed(n)
    })
    return () => { cancelled = true }
  }, [])

  const founderSlotsLeft = founderSlotsUsed != null
    ? Math.max(0, FOUNDER_TOTAL_SLOTS - founderSlotsUsed)
    : null
  const founderSlotsFull = founderSlotsLeft === 0

  return (
    <MarketingLayout>
      <SEO {...data.seo} />
      <MarketingErrorBoundary>
        <div className="relative overflow-hidden">

          {/* HERO */}
          <SectionWrapper>
            <div className="text-center max-w-3xl mx-auto">
              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary"
              >
                {data.hero.title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 text-text-secondary text-lg"
              >
                {data.hero.subtitle}
              </motion.p>

              {/* V3 Task 8: founder pricing banner. Hides once all 100
                  slots are claimed (founder_slots_used returns 100). */}
              {!founderSlotsFull && (
                <motion.div
                  variants={fadeUp}
                  className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-sm font-medium"
                >
                  <Sparkles size={16} />
                  <span>
                    Founder pricing — first {FOUNDER_TOTAL_SLOTS} customers get
                    {' '}<strong>50% off for 6 months</strong>
                    {founderSlotsLeft != null && (
                      <> · {founderSlotsLeft} {founderSlotsLeft === 1 ? 'spot' : 'spots'} left</>
                    )}
                  </span>
                </motion.div>
              )}
            </div>
          </SectionWrapper>

          {/* PLANS */}
          <SectionWrapper>
            <div className="grid md:grid-cols-3 gap-6">
              {data.plans.map((plan) => (
                <Card key={plan.name}>
                  <div className={`flex flex-col h-full ${plan.highlighted ? 'scale-[1.02]' : ''}`}>

                    {plan.highlighted && (
                      <span className="mb-4 text-xs text-accent-cyan font-semibold uppercase">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-xl font-bold text-text-primary">
                      {plan.name}
                    </h3>

                    <p className="text-text-muted text-sm mt-2">
                      {plan.description}
                    </p>

                    <div className="mt-6">
                      <span className="text-3xl font-extrabold text-text-primary">
                        {plan.price}
                      </span>
                      <span className="text-text-muted">{plan.period}</span>
                    </div>

                    <ul className="mt-6 space-y-3 text-sm text-text-secondary flex-1">
                      {plan.features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>

                    <Link
                      to={plan.ctaTo}
                      className={`mt-8 inline-block text-center px-6 py-3 rounded-xl font-semibold transition ${
                        plan.highlighted
                          ? 'bg-accent-purple text-white'
                          : 'border border-border text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                    {/* V3 Task 8: secondary WhatsApp CTA per plan. Hidden
                        when VITE_SUPPORT_WHATSAPP is unset (WhatsAppCTA
                        returns null in that case). */}
                    <WhatsAppCTA
                      planName={plan.name}
                      variant="link"
                      className="mt-3 self-center"
                      label={`WhatsApp about ${plan.name}`}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </SectionWrapper>

          {/* V3 Task 9: Tamil + English 1-pager PDF download. Files
              must be produced by translator/designer track (see
              V3_PHASE_1_IMPLEMENTATION_GUIDE.md TASK 9). Hidden
              until at least one PDF is present in /public/downloads/. */}
          {/* <SectionWrapper>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-sm text-text-muted mb-4">
                Share Gymmobius with your peers
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/downloads/gymmobius-pricing-bilingual.pdf"
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-text-primary hover:bg-bg-elevated text-sm font-medium transition"
                  onClick={(e) => {
                    // Until the PDF lands, the request 404s — prevent the
                    // blank-tab UX and surface a clean alert instead.
                    fetch(e.currentTarget.href, { method: 'HEAD' })
                      .then(r => { if (!r.ok) { e.preventDefault(); alert('PDF coming soon.') } })
                      .catch(() => { e.preventDefault(); alert('PDF coming soon.') })
                  }}
                >
                  <FileDown size={16} />
                  Pricing PDF (Tamil + English)
                </a>
              </div>
            </div>
          </SectionWrapper> */}

        </div>
      </MarketingErrorBoundary>
    </MarketingLayout>
  )
}
