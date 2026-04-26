import { motion } from 'framer-motion'
import { staggerContainer, scrollViewport, fadeUp } from '../../../lib/animations'

function ProgramCard({ program, index }) {
  return (
    <motion.div
      variants={fadeUp}
      data-force-white
      className="group relative overflow-hidden cursor-pointer"
      style={{ aspectRatio: index === 1 || index === 4 ? '3/4' : '4/5', borderRadius: 'var(--gym-card-radius)' }}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Background image with Ken Burns hover */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${program.image})` }}
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      />

      {/* Dark gradient overlay — bottom-heavy */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%)'
      }} />

      {/* Gym color tint on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ background: 'var(--gym-gradient)' }}
      />

      {/* Category badge */}
      <div className="absolute top-4 left-4">
        <span
          className="px-3 py-1 text-xs font-bold tracking-[0.15em] rounded"
          style={{
            background: 'var(--gym-gradient)',
            color: '#fff',
          }}
        >
          {program.category}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3 className="font-display text-white text-2xl tracking-wide leading-tight mb-1 group-hover:opacity-90 transition-opacity">
          {program.title.toUpperCase()}
        </h3>
        <p className="text-white/60 text-sm font-sans leading-relaxed">
          {program.description}
        </p>
        {/* Hover arrow */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="mt-3 flex items-center gap-2 text-xs font-semibold tracking-wider"
          style={{ color: 'var(--gym-primary)' }}
        >
          <span>LEARN MORE</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function ProgramsGridSection({ content, defaults }) {
  const programs = content?.training_programs?.length > 0
    ? content.training_programs
    : defaults.workoutPrograms

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={scrollViewport}
      style={{ background: 'var(--gym-bg)' }}
    >
      <div className="max-w-6xl mx-auto px-6" style={{ paddingBlock: "var(--gym-section-py)" }}>
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-14">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-3 font-sans" style={{ color: 'var(--gym-primary)' }}>
            {content?.programs_label || 'Training Programs'}
          </p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <h2 className="font-display text-white tracking-wide" style={{ fontSize: 'var(--gym-h2-size)' }}>
              {(content?.programs_heading || 'WHAT WE OFFER').toUpperCase()}
            </h2>
            <p className="text-white/45 text-sm font-sans max-w-xs leading-relaxed">
              {content?.programs_desc || 'Elite programs designed to push every limit and build your best body.'}
            </p>
          </div>
        </motion.div>

        {/* 3×2 grid with height variation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program, i) => (
            <ProgramCard key={program.id} program={program} index={i} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}
