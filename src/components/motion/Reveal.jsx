import { motion, useReducedMotion } from 'motion/react'
import { EASE } from './ease'

const VIEWPORT = { once: true, margin: '0px 0px -8% 0px' }

// Fades an element up (opacity 0 → 1, y 20px → 0) when it scrolls into view.
export function Reveal({ as = 'div', delay = 0, y = 20, className, children, ...rest }) {
  const reduced = useReducedMotion()
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: reduced ? 0.2 : 0.7, ease: EASE, delay: reduced ? 0 : delay }}
      {...rest}
    >
      {children}
    </Component>
  )
}

// A group whose <RevealItem> children appear one after another.
export function RevealGroup({ as = 'div', stagger = 0.07, className, children, ...rest }) {
  const Component = motion[as]
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function RevealItem({ as = 'div', className, children, ...rest }) {
  const reduced = useReducedMotion()
  const Component = motion[as]
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 16 },
        shown: { opacity: 1, y: 0, transition: { duration: reduced ? 0.2 : 0.6, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}
