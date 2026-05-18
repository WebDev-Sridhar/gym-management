import { useLenis } from '../../hooks/useLenis'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import Hero from '../../components/sections/Hero'
import Problem from '../../components/sections/Problem'
import Solution from '../../components/sections/Solution'
import Features from '../../components/sections/Features'
import SocialProof from '../../components/sections/SocialProof'
import Pricing from '../../components/sections/Pricing'
import FinalCTA from '../../components/sections/FinalCTA'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import SEO from '../../components/seo/SEO'
import { usePageTracking } from '../../lib/hooks/usePageTracking'
import { ROUTES, SITE } from '../../lib/constants/routes'

export default function LandingPage() {
  useLenis()
  usePageTracking('home')

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">
      <SEO
        title=""
        description={`${SITE.NAME} — ${SITE.TAGLINE}. Automate attendance, payments, and member retention for your gym.`}
        canonical={ROUTES.HOME}
        keywords="gym management software, gym crm, gym automation, member retention, gymmobius"
      />
      <Navbar />
      <main>
        <MarketingErrorBoundary>
          <Hero />
          <Problem />
          <Solution />
          <Features />
          <SocialProof />
          <Pricing />
          <FinalCTA />
        </MarketingErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
