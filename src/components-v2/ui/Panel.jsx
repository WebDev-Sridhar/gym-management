import { motion } from 'framer-motion'

// Soft floating card shell used for mini product-visual panels across V2 pages.
export function PanelShell({ children, gradient = 'bg-indigo-200', className = '' }) {
  return (
    <div className={`relative rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 p-6 overflow-hidden ${className}`}>
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-50 ${gradient}`} />
      <div className="relative">{children}</div>
    </div>
  )
}

export function ProgressRow({ label, value, color = 'bg-indigo-500' }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}
