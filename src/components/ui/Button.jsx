import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const MotionLink = motion.create(Link)

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  href,
  onClick,
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 cursor-pointer'

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const variantStyles = {
    primary:
      'bg-white text-black hover:bg-zinc-100 active:bg-zinc-200',
    secondary:
      'bg-transparent border border-white/20 text-text-primary hover:bg-white/5 hover:border-white/30',
    glass:
      'bg-white/5 border border-white/25 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/40',
    ghost:
      'bg-transparent text-text-secondary hover:text-text-primary',
  }

  // Internal routes (start with /) use React Router Link for SPA navigation
  // External/anchor links (start with # or http) use regular <a>
  const isInternalRoute = href && href.startsWith('/') && !href.startsWith('//')
  const Component = href
    ? isInternalRoute ? MotionLink : motion.a
    : motion.button

  const linkProps = href
    ? isInternalRoute ? { to: href } : { href }
    : {}

  return (
    <Component
      {...linkProps}
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </Component>
  )
}
