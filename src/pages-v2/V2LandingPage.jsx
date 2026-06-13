import '../styles-v2/v2-theme.css'
import { useLenis } from '../hooks/useLenis'
import SEO from '../components/seo/SEO'
import Navbar from '../components-v2/layout/Navbar'
import Footer from '../components-v2/layout/Footer'
import Hero from '../components-v2/sections/Hero'
import LogoCloud from '../components-v2/sections/LogoCloud'
import Features from '../components-v2/sections/Features'
import ProductShowcase from '../components-v2/sections/ProductShowcase'
import SocialProof from '../components-v2/sections/SocialProof'
import Pricing from '../components-v2/sections/Pricing'
import FAQ from '../components-v2/sections/FAQ'
import FinalCTA from '../components-v2/sections/FinalCTA'
import MarketingErrorBoundary from '../components/error/MarketingErrorBoundary'
import { usePageTracking } from '../lib/hooks/usePageTracking'
import { ROUTES, SITE } from '../lib/constants/routes'

// Isolated V2 redesign — light theme, premium SaaS aesthetic. Draft for
// comparison against the V1 landing page; not indexed by search engines.
export default function V2LandingPage() {
  useLenis()
  usePageTracking('home_v2')

  return (
    <div className="v2-root bg-white min-h-screen overflow-x-hidden">
      <SEO
        title="Gym Management Software (V2 Preview)"
        description={`${SITE.NAME} — ${SITE.TAGLINE}. Automate attendance, payments, and member retention for your gym.`}
        canonical={ROUTES.V2.HOME}
        robots="noindex,nofollow"
      />
      <Navbar />
      <main>
        <MarketingErrorBoundary>
          <Hero />
          <LogoCloud />
          <Features />
          <ProductShowcase />
          <SocialProof />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </MarketingErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
