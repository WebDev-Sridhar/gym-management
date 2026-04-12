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

export default function LandingPage() {
  useLenis()

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <SocialProof />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
