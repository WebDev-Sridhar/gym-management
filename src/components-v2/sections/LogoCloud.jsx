import ScrollReveal, { fadeIn, staggerContainer, fadeUp } from '../ui/ScrollReveal'
import { motion } from 'framer-motion'

const GYMS = ['Iron Paradise', 'PowerHouse Fitness', 'FlexZone', 'PeakForm', 'CityFit Studios', 'The Grind Club']

export default function LogoCloud() {
  return (
    <section className="bg-white py-12 border-y border-gray-100">
      <div className="mx-auto max-w-6xl px-6">
        <ScrollReveal variant={fadeIn}>
          <p className="text-center text-sm font-medium text-gray-400 mb-8">
            Trusted by gyms and fitness studios across India
          </p>
        </ScrollReveal>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6"
        >
          {GYMS.map((name) => (
            <motion.span
              key={name}
              variants={fadeUp}
              className="text-gray-400 font-semibold text-lg tracking-tight grayscale opacity-70 hover:opacity-100 hover:grayscale-0 hover:text-indigo-500 transition-all"
            >
              {name}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
