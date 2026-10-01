import { motion, useSpring } from 'motion/react'
import { usePointerEffects } from '../../hooks/usePointer'
import Icon from '../Icon'

// A button that leans a few pixels toward the cursor, with an arrow that slides on hover.
// On touch devices and with reduced motion it behaves like a normal button.
export default function MagneticButton({ children, variant = 'primary', arrow = false, className = '', max = 6, ...props }) {
  const enabled = usePointerEffects()
  const x = useSpring(0, { stiffness: 260, damping: 18 })
  const y = useSpring(0, { stiffness: 260, damping: 18 })

  function handleMove(event) {
    if (!enabled || props.disabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    x.set(Math.max(-max, Math.min(max, dx * 0.2)))
    y.set(Math.max(-max, Math.min(max, dy * 0.3)))
  }

  function handleLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      type="button"
      className={`btn btn-${variant} ${className}`}
      style={{ x, y }}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...props}
    >
      <span className="btn-label">{children}</span>
      {arrow && (
        <span className="btn-arrow" aria-hidden="true">
          <Icon name="arrowRight" size={16} />
        </span>
      )}
    </motion.button>
  )
}
