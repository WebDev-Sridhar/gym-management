import Navbar from './Navbar'
import Footer from './Footer'

export default function MarketingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      
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