import { useMemo } from 'react'
import { getThemeCSSVars } from '../../../../lib/gymTheme'
import { getDefaultContent } from '../../../../lib/gymDefaultContent'

// Import the actual public section components
import HeroSection from '../../../../components/gym/sections/HeroSection'
import AboutSection from '../../../../components/gym/sections/AboutSection'
import ProgramsSection from '../../../../components/gym/sections/ProgramsSection'
import ProgramsGridSection from '../../../../components/gym/sections/ProgramsGridSection'
import TrainersSection from '../../../../components/gym/sections/TrainersSection'
import TestimonialsSection from '../../../../components/gym/sections/TestimonialsSection'

const SECTION_MAP = {
  hero:         HeroSection,
  about:        AboutSection,
  pricing:      ProgramsSection,
  programs:     ProgramsGridSection,
  trainers:     TrainersSection,
  testimonials: TestimonialsSection,
}

const SECTION_LABELS = {
  hero:         'Hero Section',
  about:        'About Section',
  pricing:      'Pricing Section',
  programs:     'Programs Section',
  trainers:     'Trainers Section',
  testimonials: 'Testimonials Section',
}

/**
 * PreviewPanel — renders a scaled live preview of the currently edited section.
 *
 * Props:
 *   section      string  — which section to preview ('hero'|'about'|'pricing'|'trainers'|'testimonials')
 *   previewData  object  — live-edited CMS content (not yet saved to DB)
 *   gym          object  — gym record (for theme color, name, city, slug)
 *   plans        array   — gym_plans array (for pricing preview)
 *   trainers     array   — gym_trainers array (for trainers preview)
 *   testimonials array   — testimonials array
 */
export default function PreviewPanel({ section, previewData, gym, plans = [], trainers = [], testimonials = [] }) {
  const SectionComponent = SECTION_MAP[section]
  const themeVars = useMemo(() => getThemeCSSVars(gym?.theme_color || '#8B5CF6'), [gym?.theme_color])
  const defaults = useMemo(() => getDefaultContent(gym?.name, gym?.city), [gym?.name, gym?.city])

  if (!SectionComponent || !gym) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-400">No preview available for this section</p>
      </div>
    )
  }

  // Build props for each section component
  const sectionProps = buildSectionProps(section, { previewData, gym, plans, trainers, testimonials, defaults })

  return (
    <div className="sticky top-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-500">Live Preview</span>
        </div>
        <span className="text-xs text-gray-400">{SECTION_LABELS[section]}</span>
      </div>

      {/* Preview frame */}
      <div className="w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-900">
        {/* Scroll container — pointer events on so scroll works */}
        <div style={{ ...themeVars, height: 'calc(100vh - 180px)', overflowY: 'auto' }} className='md:w-full w-[calc(100vw-50px)]'>
          {/* zoom scales layout + visual together — no width/height mismatch, scroll works correctly */}
          <div style={{ zoom: 0.65, pointerEvents: 'none' }}>
            <SectionComponent {...sectionProps} />
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-gray-400">
        Changes appear here instantly — hit Save to publish
      </p>
    </div>
  )
}

// ─── Build props per section type ─────────────────────────────────────────────
function buildSectionProps(section, { previewData, gym, plans, trainers, testimonials, defaults }) {
  switch (section) {
    case 'hero':
      return { gym, content: previewData, defaults }

    case 'about':
      return { content: previewData, defaults }

    case 'pricing':
      return { plans, defaults }

    case 'programs':
      return { content: previewData, defaults }

    case 'trainers':
      return { gym, trainers, defaults, themeColor: gym?.theme_color }

    case 'testimonials':
      return { testimonials, defaults }

    default:
      return {}
  }
}
