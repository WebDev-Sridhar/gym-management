import { useMemo } from 'react'
import { MotionConfig } from 'framer-motion'
import { getFullThemeCSSVars, getFontStack } from '../../../../lib/gymTheme'
import { getDefaultContent } from '../../../../lib/gymDefaultContent'

// Import the actual public section components
import HeroSection from '../../../../components/gym/sections/HeroSection'
import StatsSection from '../../../../components/gym/sections/StatsSection'
import AboutSection from '../../../../components/gym/sections/AboutSection'
import ProgramsGridSection from '../../../../components/gym/sections/ProgramsGridSection'
import TrainersSection from '../../../../components/gym/sections/TrainersSection'
import TestimonialsSection from '../../../../components/gym/sections/TestimonialsSection'
import WhyUsSection from '../../../../components/gym/sections/WhyUsSection'
import GallerySection from '../../../../components/gym/sections/GallerySection'

// Regular section component map (excludes sections with custom preview logic)
const SECTION_MAP = {
  hero:           HeroSection,
  stats:          StatsSection,
  about:          AboutSection,
  programs:       ProgramsGridSection,
  trainers:       TrainersSection,
  testimonials:   TestimonialsSection,
  gallery:        GallerySection,
  why_us_content: WhyUsSection,
}

const SECTION_LABELS = {
  theme:              'Home Page',
  design:             'Home Page',
  hero:               'Hero Section',
  stats:              'Stats Section',
  gallery:            'Gallery',
  about:              'About Section',
  pricing:            'Pricing — Plans',
  programs:           'Programs Section',
  trainers:           'Trainers Section',
  testimonials:       'Testimonials Section',
  why_us_content:     'Why Choose Us',
  vision_mission:     'Vision & Mission',
  faq:                'FAQ Section',
  page_hero_about:    'About Page — Hero',
  page_hero_pricing:  'Pricing Page — Hero',
  page_hero_trainers: 'Trainers Page — Hero',
  page_hero_contact:  'Contact Page — Hero',
  cta_home:           'Home — CTA',
  cta_about:          'About — CTA',
  cta_pricing:        'Pricing — CTA',
  cta_trainers:       'Trainers — CTA',
  cta_contact:        'Contact — CTA',
}

// Page key → DB field prefix mapping (for page hero sections)
const PAGE_HERO_KEY_MAP = {
  page_hero_about:    'about',
  page_hero_pricing:  'pricing',
  page_hero_trainers: 'trainers',
  page_hero_contact:  'contact',
}

const PAGE_HERO_FALLBACKS = {
  about:    { label: 'Our Story',      title: 'ABOUT US',         desc: '' },
  pricing:  { label: 'Membership',    title: 'CHOOSE YOUR PLAN', desc: 'No contracts. No hidden fees. Just premium fitness, priced for real people.' },
  trainers: { label: 'Expert Coaches', title: 'MEET THE COACHES', desc: 'Our certified coaches are here to guide you.' },
  contact:  { label: 'Reach Out',     title: 'GET IN TOUCH',     desc: "Questions or tour requests — we're here." },
}

const CTA_DEFAULTS = {
  cta_home:     'ARE YOU IN?',
  cta_about:    'JOIN US TODAY',
  cta_pricing:  'START TODAY',
  cta_trainers: 'TRAIN WITH THE BEST',
  cta_contact:  'COME VISIT US',
}

const DEFAULT_INCLUDED = [
  '24/7 gym floor access', 'Free fitness assessment',
  'Locker & shower facilities', 'Free parking',
  'Member mobile app', 'No joining fee ever',
]

const DEFAULT_FAQ = [
  { q: 'Can I cancel my membership anytime?', a: 'Yes. Monthly plans can be cancelled at any time with no hidden fees.' },
  { q: 'Is there a joining fee?',             a: 'No joining fee ever. Pay only for your chosen plan.' },
  { q: 'Do you offer a free trial?',          a: 'Yes! We offer a 1-day free trial pass for new members.' },
  { q: 'What are the gym timings?',           a: 'Monday–Saturday 5:30 AM – 10:30 PM, Sunday 6:00 AM – 8:00 PM.' },
]

// ─── Inline Preview Components ────────────────────────────────────────────────

function PageHeroPreview({ previewData, pageKey }) {
  const fbs      = PAGE_HERO_FALLBACKS[pageKey]
  const label    = previewData?.[`${pageKey}_page_label`] || fbs.label
  const rawTitle = previewData?.[`${pageKey}_page_title`] || fbs.title
  const desc     = previewData?.[`${pageKey}_page_desc`]  || fbs.desc
  const heroImg       = previewData?.[`${pageKey}_page_image`] || null
  const defaultAlign  = pageKey === 'pricing' ? 'center' : 'left'
  const heroAlign     = previewData?.[`${pageKey}_page_align`] || defaultAlign
  const isCentered    = heroAlign === 'center'
  const title         = rawTitle.toUpperCase()

  return (
    <section className="relative overflow-hidden" style={{ paddingTop: '9rem', paddingBottom: '6rem', background: heroImg ? 'transparent' : 'var(--gym-surface)' }}>
      {heroImg ? (
        <>
          <img src={heroImg} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.62)' }} />
        </>
      ) : (
        <div className="absolute inset-0 opacity-5" style={{ background: 'var(--gym-gradient-diagonal)' }} />
      )}
      <div style={{ position: 'relative', maxWidth: '72rem', margin: '0 auto', paddingInline: '1.5rem', textAlign: isCentered ? 'center' : 'left' }}>
        <p className="font-sans font-bold uppercase mb-4" style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: 'var(--gym-primary)' }}>
          {label}
        </p>
        <h1 className="font-display tracking-wide leading-none" style={{ fontSize: 'var(--gym-h1-size)', color: '#fff' }}>
          {title}
        </h1>
        {desc && (
          <p className="mt-6 max-w-md font-sans leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)', marginInline: isCentered ? 'auto' : undefined }}>
            {desc}
          </p>
        )}
      </div>
    </section>
  )
}

const VISION_DEFAULT  = "To be the city's most transformative fitness community — where every person achieves their strongest self."
const MISSION_DEFAULT = 'To provide elite coaching, world-class facilities, and an unbreakable community that makes fitness accessible to all.'

function VisionMissionPreview({ previewData }) {
  const vision  = previewData?.vision?.trim()  || VISION_DEFAULT
  const mission = previewData?.mission?.trim() || MISSION_DEFAULT
  const label   = previewData?.vision_section_label   || 'Purpose'
  const heading = (previewData?.vision_section_heading || 'VISION & MISSION').toUpperCase()

  return (
    <section style={{ background: 'var(--gym-bg)', paddingBlock: 'var(--gym-section-py)' }}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', paddingInline: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="font-sans font-bold uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: 'var(--gym-primary)' }}>{label}</p>
          <h2 className="font-display tracking-wide" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>{heading}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {[{ label: 'Our Vision', text: vision }, { label: 'Our Mission', text: mission }].map((item, i) => (
            <div key={i} style={{ padding: '2rem', position: 'relative', overflow: 'hidden', border: '1px solid var(--gym-border)', background: 'var(--gym-card)', borderRadius: 'var(--gym-card-radius)', boxShadow: 'var(--gym-shadow)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'var(--gym-gradient)' }} />
              <p className="font-sans font-bold uppercase mb-4" style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--gym-primary)' }}>{item.label}</p>
              <p className="font-sans leading-relaxed" style={{ color: 'var(--gym-text-secondary)' }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingPreview({ previewData, plans, defaults }) {
  const label    = previewData?.plans_section_label    || 'Membership'
  const heading  = (previewData?.plans_section_heading  || defaults.programs.heading).toUpperCase()
  const subtitle = previewData?.plans_section_subtitle || defaults.programs.subtitle
  const pricingLabel   = previewData?.pricing_section_label   || 'Included in all plans'
  const pricingHeading = (previewData?.pricing_section_heading || 'EVERY PLAN INCLUDES').toUpperCase()
  const displayPlans   = plans.length > 0 ? plans : defaults.programs.fallbackPlans
  const displayIncluded = previewData?.included_features?.length > 0 ? previewData.included_features : DEFAULT_INCLUDED

  return (
    <>
      {/* Plans section */}
      <section style={{ background: 'var(--gym-surface)', borderTop: '1px solid var(--gym-border)', paddingBlock: 'var(--gym-section-py)' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', paddingInline: '1.5rem', textAlign: 'center' }}>
          <p className="font-sans font-bold uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: 'var(--gym-primary)' }}>{label}</p>
          <h2 className="font-display tracking-wide mb-3" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>{heading}</h2>
          <p className="font-sans mb-10" style={{ color: 'var(--gym-text-secondary)', maxWidth: '32rem', margin: '0 auto 2.5rem' }}>{subtitle}</p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(displayPlans.length, 3)}, 1fr)`, gap: '1.5rem', marginTop: '2.5rem' }}>
            {displayPlans.slice(0, 3).map((plan, i) => (
              <div key={i} style={{ padding: '2rem', border: `1px solid ${plan.is_popular ? 'var(--gym-primary)' : 'var(--gym-border)'}`, borderRadius: 'var(--gym-card-radius)', background: 'var(--gym-card)', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                {plan.is_popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--gym-gradient)' }} />}
                <p className="font-sans font-bold uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--gym-primary)' }}>{plan.is_popular ? 'Most Popular' : 'Plan'}</p>
                <p className="font-display tracking-wide mb-1" style={{ fontSize: '1.25rem', color: 'var(--gym-text)' }}>{(plan.name || '').toUpperCase()}</p>
                <p style={{ color: 'var(--gym-primary)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '1rem' }}>₹{Number(plan.price || 0).toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', color: 'var(--gym-text-secondary)', fontWeight: 400 }}> / {plan.duration_label || 'mo'}</span></p>
                {(plan.features || []).slice(0, 4).map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--gym-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" fill="white" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gym-text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Included features */}
      <section style={{ background: 'var(--gym-bg)', borderTop: '1px solid var(--gym-border)', paddingBlock: 'var(--gym-section-py)' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto', paddingInline: '1.5rem', textAlign: 'center' }}>
          <p className="font-sans font-bold uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: 'var(--gym-primary)' }}>{pricingLabel}</p>
          <h2 className="font-display tracking-wide mb-10" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>{pricingHeading}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left' }}>
            {displayIncluded.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--gym-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" fill="white" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
                <span className="font-sans" style={{ fontSize: '0.875rem', color: 'var(--gym-text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function FAQPreview({ previewData }) {
  const label   = previewData?.faq_label   || 'FAQ'
  const heading = (previewData?.faq_heading || 'GOT QUESTIONS?').toUpperCase()
  const items   = previewData?.faq_items?.length > 0 ? previewData.faq_items : DEFAULT_FAQ

  return (
    <section style={{ background: 'var(--gym-bg)', paddingBlock: 'var(--gym-section-py)' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', paddingInline: '1.5rem', textAlign: 'center' }}>
        <p className="font-sans font-bold uppercase mb-3" style={{ fontSize: '0.75rem', letterSpacing: '0.25em', color: 'var(--gym-primary)' }}>{label}</p>
        <h2 className="font-display tracking-wide mb-10" style={{ fontSize: 'var(--gym-h2-size)', color: 'var(--gym-text)' }}>{heading}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
          {items.map((faq, i) => (
            <div key={i} style={{ border: '1px solid var(--gym-border)', borderRadius: 'var(--gym-card-radius)', background: 'var(--gym-card)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', gap: '1rem' }}>
                <span className="font-sans font-semibold" style={{ fontSize: '0.875rem', color: 'var(--gym-text)' }}>{faq.q}</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--gym-text-secondary)', flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTAPreview({ previewData, ctaKey }) {
  const heading = (previewData?.[ctaKey] || CTA_DEFAULTS[ctaKey] || 'GET STARTED').toUpperCase()
  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--gym-gradient-diagonal)', padding: '6rem 1.5rem', textAlign: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' }} />
      <div style={{ position: 'relative' }}>
        <h2 className="font-display tracking-widest leading-none mb-8" style={{ fontSize: 'var(--gym-h1-size)', color: '#fff' }}>
          {heading}
        </h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', background: '#fff', borderRadius: 'var(--gym-card-radius)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--gym-primary)' }}>
          Get Started
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </div>
      </div>
    </section>
  )
}

// ─── Main PreviewPanel ────────────────────────────────────────────────────────

export default function PreviewPanel({ section, previewData, gym, plans = [], trainers = [], testimonials = [] }) {
  const themeVars = useMemo(() => getFullThemeCSSVars(gym || {}), [gym])
  const defaults = useMemo(() => getDefaultContent(gym?.name, gym?.city), [gym?.name, gym?.city])
  const fontStack = gym?.font_family && gym.font_family !== 'default' ? getFontStack(gym.font_family) : null

  if (!gym) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No preview available</p>
      </div>
    )
  }

  const SectionComponent = SECTION_MAP[section]
  const pageHeroKey = PAGE_HERO_KEY_MAP[section]
  const isCTA = section.startsWith('cta_')

  let previewContent = null

  if (section === 'theme' || section === 'design') {
    previewContent = (
      <>
        <HeroSection        {...buildSectionProps('hero',         { previewData, gym, plans, trainers, testimonials, defaults })} />
        <StatsSection       {...buildSectionProps('stats',        { previewData, gym, plans, trainers, testimonials, defaults })} />
        <AboutSection       {...buildSectionProps('about',        { previewData, gym, plans, trainers, testimonials, defaults })} />
        <ProgramsGridSection {...buildSectionProps('programs',    { previewData, gym, plans, trainers, testimonials, defaults })} />
        <TrainersSection    {...buildSectionProps('trainers',     { previewData, gym, plans, trainers: previewData?._trainers     ?? trainers,     testimonials, defaults })} />
        <TestimonialsSection {...buildSectionProps('testimonials',{ previewData, gym, plans, trainers, testimonials: previewData?._testimonials ?? testimonials, defaults })} />
        <GallerySection     {...buildSectionProps('gallery',     { previewData, gym, plans, trainers, testimonials, defaults })} />
      </>
    )
  } else if (SectionComponent) {
    const sectionProps = buildSectionProps(section, { previewData, gym, plans, trainers, testimonials, defaults })
    previewContent = <SectionComponent key={previewData?._ts || section} {...sectionProps} />
  } else if (section === 'pricing') {
    previewContent = <PricingPreview previewData={previewData} plans={plans} defaults={defaults} />
  } else if (section === 'faq') {
    previewContent = <FAQPreview previewData={previewData} />
  } else if (isCTA) {
    previewContent = <CTAPreview previewData={previewData} ctaKey={section} />
  } else if (pageHeroKey) {
    previewContent = <PageHeroPreview previewData={previewData} pageKey={pageHeroKey} />
  } else if (section === 'vision_mission') {
    previewContent = <VisionMissionPreview previewData={previewData} />
  } else {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No preview available for this section</p>
      </div>
    )
  }

  return (
    <div className="sticky top-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-500">Live Preview</span>
        </div>
        <span className="text-xs text-gray-400">{SECTION_LABELS[section] || section}</span>
      </div>

      {/* Preview frame */}
      <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-900">
        <div
          data-gym-theme={gym?.theme_mode || 'dark'}
          style={{ ...themeVars, background: 'var(--gym-bg)', height: 'calc(100vh - 180px)', overflowY: 'auto' }}
          className="md:w-full w-[calc(100vw-50px)]"
        >
          {fontStack && (
            <style>{`.font-display { font-family: ${fontStack} !important; }`}</style>
          )}
          <MotionConfig initial={false}>
            <div style={{ zoom: 0.65, pointerEvents: 'none' }}>
              {previewContent}
            </div>
          </MotionConfig>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        Changes appear here instantly — hit Save to publish
      </p>
    </div>
  )
}

// ─── Build props per section type ─────────────────────────────────────────────
function buildSectionProps(section, { previewData, gym, trainers, testimonials, defaults }) {
  switch (section) {
    case 'hero':
      return {
        gym: previewData?._hero_style ? { ...gym, hero_style: previewData._hero_style } : gym,
        content: previewData,
        defaults,
      }

    case 'stats':
      return { content: previewData, defaults }

    case 'gallery':
      return { content: previewData, defaults }

    case 'about':
      return { content: previewData, defaults }

    case 'programs':
      return { content: previewData, defaults }

    case 'trainers':
      return { gym, trainers: previewData?._trainers ?? trainers, defaults, themeColor: gym?.theme_color, content: previewData }

    case 'testimonials':
      return { testimonials: previewData?._testimonials ?? testimonials, defaults, content: previewData }

    case 'why_us_content':
      return { content: previewData }

    default:
      return {}
  }
}
