const BACKGROUNDS = {
  white: 'bg-white',
  gray: 'bg-gray-50',
}

export default function SectionContainer({ background = 'white', className = '', innerClassName = '', children, id }) {
  return (
    <section id={id} className={`relative ${BACKGROUNDS[background]} ${className}`}>
      <div className={`mx-auto max-w-6xl px-6 py-20 sm:py-28 ${innerClassName}`}>
        {children}
      </div>
    </section>
  )
}

export function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
      {children}
    </span>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center' }) {
  const alignment = align === 'center' ? 'text-center items-center mx-auto' : 'text-left items-start'
  return (
    <div className={`flex flex-col gap-4 max-w-2xl ${alignment}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}
