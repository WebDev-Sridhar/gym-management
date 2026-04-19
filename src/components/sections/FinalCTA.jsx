import { motion } from 'framer-motion'
import { fadeUp, staggerContainer, scrollViewport } from '../../lib/animations'
import Button from '../ui/Button'

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0B0B0F 0%, #1a0a2e 25%, #0B0B0F 50%, #0a1628 75%, #0B0B0F 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 10s ease infinite',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent-purple/10 blur-[100px] rounded-full" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[200px] bg-accent-blue/8 blur-[80px] rounded-full" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={scrollViewport}
        className="relative max-w-4xl mx-auto px-6 py-28 md:py-36 text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text-primary leading-tight tracking-tight"
        >
          Start Managing Your Gym the Smart Way
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-6 text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Join 500+ gym owners who've already made the switch. Set up takes under 10 minutes. No credit card required.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-wrap justify-center gap-4 mt-10"
        >
          <Button size="lg" href="/signup">
            Start Your Free Trial
          </Button>
          <Button variant="secondary" size="lg" href="#features">
            Watch Demo
          </Button>
        </motion.div>
      </motion.div>

      {/* CSS animation keyframes */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  )
}
