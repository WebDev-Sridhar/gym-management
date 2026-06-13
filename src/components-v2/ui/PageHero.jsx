import ScrollReveal, { fadeUp } from './ScrollReveal'
import { Eyebrow } from './SectionContainer'

// Compact hero banner for V2 sub-pages (features, pricing, legal, etc).
// Sits below the fixed navbar with its own gradient backdrop.
export default function PageHero({ eyebrow, title, subtitle, children }) {
  return (
    <section className="relative bg-gradient-to-b from-indigo-50/70 via-white to-white pt-36 pb-16 sm:pt-44 sm:pb-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <ScrollReveal variant={fadeUp} className="flex flex-col items-center gap-5">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
          {children}
        </ScrollReveal>
      </div>
    </section>
  )
}
