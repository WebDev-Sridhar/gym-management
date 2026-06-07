import Navbar from './Navbar'
import Footer from './Footer'
import JsonLd from '../seo/JsonLd'
import { organizationSchema, websiteSchema } from '../../lib/seo/structuredData'

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">

      {/* Site-wide structured data — Organization + WebSite identity.
          Page-specific schema (SoftwareApplication, FAQ, Breadcrumb) is
          added per-page via <SEO jsonLd={...} />. */}
      <JsonLd data={[organizationSchema(), websiteSchema()]} />

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
      
    </div>
  )
}