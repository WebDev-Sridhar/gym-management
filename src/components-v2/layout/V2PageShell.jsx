import '../../styles-v2/v2-theme.css'
import { useLenis } from '../../hooks/useLenis'
import SEO from '../../components/seo/SEO'
import MarketingErrorBoundary from '../../components/error/MarketingErrorBoundary'
import Navbar from './Navbar'
import Footer from './Footer'

// Shared shell for every V2 marketing/legal page — light theme, draft
// pages stay out of search results until V2 is promoted.
export default function V2PageShell({ seo, children }) {
  useLenis()

  return (
    <div className="v2-root bg-white min-h-screen overflow-x-hidden">
      <SEO {...seo} robots={seo?.robots || 'noindex,nofollow'} />
      <Navbar />
      <main>
        <MarketingErrorBoundary>{children}</MarketingErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}
