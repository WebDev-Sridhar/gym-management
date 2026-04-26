import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGym } from '../../store/GymContext'
import { fetchGymPlans, fetchGymContent } from '../../services/gymPublicService'
import { getDefaultContent } from '../../lib/gymDefaultContent'
import { staggerContainer, scrollViewport, fadeUp } from '../../lib/animations'
import PricingCard from '../../components/gym/PricingCard'

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans can be cancelled at any time with no hidden fees.' },
  { q: 'Is there a joining fee?', a: 'No joining fee for any plan. You only pay the listed monthly price.' },
  { q: 'Can I switch plans?', a: 'Absolutely. You can upgrade or downgrade your plan at the start of any billing cycle.' },
  { q: 'Do you offer student discounts?', a: 'Yes — show a valid student ID at reception for 15% off any monthly plan.' },
  { q: 'What\'s included in personal training?', a: 'Pro and Elite plans include dedicated PT sessions with a certified coach tailored to your goals.' },
  { q: 'Is there a trial period?', a: 'We offer a 7-day free trial for new members. No credit card required to start.' },
]

export default function GymPricing() {
  const { gym } = useGym()
  const [plans, setPlans] = useState([])
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    if (!gym?.id) return
    Promise.all([
      fetchGymPlans(gym.id).catch(() => []),
      fetchGymContent(gym.id).catch(() => null),
    ]).then(([p, c]) => { setPlans(p); setContent(c) }).finally(() => setLoading(false))
  }, [gym?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--gym-bg)' }}>
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--gym-primary)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const defaults = getDefaultContent(gym?.name, gym?.city)
  const displayPlans    = plans.length > 0 ? plans : defaults.programs.fallbackPlans
  const displayIncluded = content?.included_features?.length > 0
    ? content.included_features
    : ['24/7 gym floor access', 'Free fitness assessment', 'Locker & shower facilities', 'Free parking', 'Member mobile app', 'Progress tracking dashboard', 'Community events & challenges', 'No joining fee ever']
  const displayFaqs = content?.faq_items?.length > 0 ? content.faq_items : faqs
  const heroImg   = content?.pricing_page_image || null
  const heroAlign = content?.pricing_page_align || 'center'
  const hidden    = Array.isArray(content?.hidden_sections) ? content.hidden_sections : []

  return (
    <div style={{ background: 'var(--gym-bg)' }}>

      {/* ── Page Hero ── */}
      {!hidden.includes('page_hero_pricing') && (
        <section className="relative overflow-hidden pt-36 pb-24"
          style={{ background: heroImg ? 'transparent' : 'var(--gym-surface)' }}>
          {heroImg ? (
            <>
              <img src={heroImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.62)' }} />
            </>
          ) : (
            <div className="absolute inset-0 opacity-5" style={{ background: 'var(--gym-gradient-diagonal)' }} />
          )}
          <div className={`relative max-w-6xl mx-auto px-6 ${heroAlign === 'center' ? 'text-center' : ''}`}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-4 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {content?.pricing_page_label || 'Membership'}
              </p>
              <h1 className="font-display text-white tracking-wide leading-none" style={{ fontSize: 'var(--gym-h1-size)' }}>
                {content?.pricing_page_title ? content.pricing_page_title.toUpperCase() : <>CHOOSE YOUR<br />PLAN</>}
              </h1>
              <p className={`text-white/45 mt-6 font-sans leading-relaxed ${heroAlign === 'center' ? 'max-w-lg mx-auto' : 'max-w-lg'}`}>
                {content?.pricing_page_desc || 'No contracts. No hidden fees. Just premium fitness, priced for real people.'}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Pricing Cards ── */}
      {!hidden.includes('pricing') && (
        <motion.section
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
          style={{ borderTop: '1px solid var(--gym-border)' }}
        >
          <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: "var(--gym-section-py)" }}>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {content?.plans_section_label || 'Membership'}
              </p>
              <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
                {(content?.plans_section_heading || defaults.programs.heading).toUpperCase()}
              </h2>
              <p className="text-white/45 mt-4 max-w-lg mx-auto font-sans">
                {content?.plans_section_subtitle || defaults.programs.subtitle}
              </p>
            </motion.div>
            <div className={`grid gap-6 ${
              displayPlans.length === 1 ? 'max-w-sm mx-auto' :
              displayPlans.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {displayPlans.map(plan => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── Feature Comparison banner (always shown) ── */}
      <motion.section
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)', borderBottom: '1px solid var(--gym-border)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
              {content?.pricing_section_label || 'Included in all plans'}
            </p>
            <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
              {(content?.pricing_section_heading || 'EVERY PLAN INCLUDES').toUpperCase()}
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayIncluded.map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--gym-gradient)' }}>
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white/65 text-sm font-sans">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      {!hidden.includes('faq') && (
        <motion.section
          variants={staggerContainer} initial="hidden" whileInView="visible" viewport={scrollViewport}
        >
          <div className="max-w-3xl mx-auto px-6 py-24">
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
                {content?.faq_label || 'FAQ'}
              </p>
              <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
                {(content?.faq_heading || 'GOT QUESTIONS?').toUpperCase()}
              </h2>
            </motion.div>
            <div className="space-y-3">
              {displayFaqs.map((faq, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="overflow-hidden"
                  style={{ background: 'var(--gym-card)', border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)' }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
                  >
                    <span className="text-white font-semibold text-sm font-sans">{faq.q}</span>
                    <motion.svg
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="w-5 h-5 text-white/40 shrink-0 ml-4"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-white/50 text-sm font-sans leading-relaxed">{faq.a}</p>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ── CTA ── */}
      {!hidden.includes('cta_pricing') && (
        <section data-force-white className="relative overflow-hidden" style={{ background: 'var(--gym-gradient-diagonal)' }}>
          <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-display text-white tracking-widest leading-none mb-8"
              style={{ fontSize: 'var(--gym-h1-size)' }}
            >
              {content?.cta_pricing || 'START TODAY'}
            </motion.h2>
            <Link
              to={`/${gym.slug}/contact`}
              className="inline-flex items-center gap-2 px-10 py-4 bg-white font-bold text-sm font-sans hover:-translate-y-1 transition-all duration-300"
              style={{ color: 'var(--gym-primary)', borderRadius: 'var(--gym-card-radius)' }}
            >
              Get In Touch
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
