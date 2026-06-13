import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ScrollReveal, { scaleIn } from '../ui/ScrollReveal'
import Button from '../ui/Button'
import { ROUTES } from '../../lib/constants/routes'

export default function FinalCTA() {
  return (
    <section className="bg-white px-6 py-20 sm:py-28">
      <ScrollReveal variant={scaleIn} className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 px-8 py-16 sm:px-16 sm:py-20 text-center">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Ready to run your gym smarter?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">
              Join hundreds of gyms already using Gymmobius to manage memberships, attendance, payments, and more — all in one platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to={ROUTES.AUTH.SIGNUP}>
                <Button size="lg" variant="secondary">
                  Get Started Free
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link to={ROUTES.CONTACT}>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                  Talk to sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
