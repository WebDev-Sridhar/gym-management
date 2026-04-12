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
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-7 py-3.5 text-base',
    lg: 'px-9 py-4 text-lg',
  }

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-accent-purple to-accent-blue text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)]',
    secondary:
      'bg-transparent border border-border text-text-primary hover:border-accent-purple/50 hover:bg-accent-purple/5',
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
