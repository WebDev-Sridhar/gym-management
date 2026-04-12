import { motion } from 'framer-motion'
import SectionWrapper from '../layout/SectionWrapper'
import Card from '../ui/Card'
import GradientText from '../ui/GradientText'
import { fadeUp } from '../../lib/animations'
import { PROBLEMS } from '../../lib/constants'
import { ClipboardIcon, WalletIcon, GhostIcon, ChartDownIcon } from '../ui/Icons'

const problemIcons = {
  clipboard: ClipboardIcon,
  wallet: WalletIcon,
  ghost: GhostIcon,
  chartDown: ChartDownIcon,
}

export default function Problem() {
  return (
    <SectionWrapper id="about">
      {/* Section Header */}
      <div className="text-center mb-16">
        <motion.span
          variants={fadeUp}
          className="inline-block text-sm font-medium text-red-400/80 uppercase tracking-widest mb-4"
        >
          Sound Familiar?
        </motion.span>
        <GradientText
          as="h2"
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight"
        >
          The Gym Owner's Daily Chaos
        </GradientText>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-text-secondary text-lg max-w-2xl mx-auto"
        >
          You didn't start a gym to drown in spreadsheets. But here you are.
        </motion.p>
      </div>

      {/* Problem Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {PROBLEMS.map((problem) => {
          const Icon = problemIcons[problem.iconKey]
          return (
            <Card
              key={problem.title}
              glowColor="rgba(139, 92, 246, 0.15)"
            >
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-text-primary font-bold text-lg mb-2">{problem.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{problem.description}</p>
            </Card>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
