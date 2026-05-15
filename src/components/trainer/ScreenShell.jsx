import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

// ease-out-quart — matches iOS UIKit transition curve
const EASE = [0.25, 0.46, 0.45, 0.94]

export default function ScreenShell({ isActive, idx, activeIdx, hasBeenVisited, children }) {
  const divRef      = useRef(null)
  const savedScroll = useRef(0)

  // Save/restore scroll position when switching tabs
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    if (!isActive) {
      savedScroll.current = el.scrollTop
    } else {
      // rAF ensures the element is visible before we set scrollTop
      requestAnimationFrame(() => {
        if (divRef.current) divRef.current.scrollTop = savedScroll.current
      })
    }
  }, [isActive])

  return (
    <motion.div
      ref={divRef}
      animate={{
        x:       isActive ? '0%' : (idx < activeIdx ? '-100%' : '100%'),
        opacity: isActive ? 1 : 0,
      }}
      transition={{
        x:       { duration: 0.28, ease: EASE },
        opacity: { duration: 0.20, ease: 'easeOut' },
      }}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',  // momentum scroll on iOS Safari
        paddingBottom: 76,                 // nav bar height compensation
        pointerEvents: isActive ? 'auto'    : 'none',
        // visibility:hidden keeps the GPU compositor layer alive (unlike display:none)
        // so slide animations are paint-free. Inactive screens are also removed from
        // the a11y tree and cannot receive focus or pointer events.
        visibility:    isActive ? 'visible' : 'hidden',
        willChange: 'transform',
      }}
      className="screen-shell"
      aria-hidden={!isActive}
    >
      {/* Only render children after first visit to save memory on cold start */}
      {hasBeenVisited ? children : null}
    </motion.div>
  )
}
