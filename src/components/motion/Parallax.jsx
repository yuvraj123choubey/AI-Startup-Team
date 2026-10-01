import { motion, useTransform } from 'motion/react'

// Moves its children by up to `depth` pixels, following pointer values from usePointerParallax().
// Higher depth = feels closer to the viewer.
export default function Parallax({ x, y, depth = 4, className, style, children, ...rest }) {
  const tx = useTransform(x, (v) => v * depth)
  const ty = useTransform(y, (v) => v * depth)
  return (
    <motion.div className={className} style={{ ...style, x: tx, y: ty }} {...rest}>
      {children}
    </motion.div>
  )
}
