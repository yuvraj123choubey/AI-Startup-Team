import { motion, useReducedMotion } from 'motion/react'
import { EASE } from './ease'

// Wraps every page. App.jsx swaps pages inside <AnimatePresence>, so each page
// fades up out of a light blur on enter and drifts away on exit.
export default function AnimatedPage({ children, className = '' }) {
  const reduced = useReducedMotion()

  const variants = reduced
    ? {
        initial: { opacity: 0 },
        enter: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
        // filter is cleared afterwards so fixed/sticky children are not affected by it
        enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: EASE }, transitionEnd: { filter: 'none' } },
        exit: { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.2, ease: 'easeIn' } },
      }

  return (
    <motion.div className={`page ${className}`} variants={variants} initial="initial" animate="enter" exit="exit">
      {children}
    </motion.div>
  )
}
