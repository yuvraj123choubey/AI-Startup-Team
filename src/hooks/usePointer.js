import { useEffect, useState } from 'react'
import { useMotionValue, useReducedMotion, useSpring } from 'motion/react'

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

// True only on devices with a mouse/trackpad AND when the user has not asked for reduced motion.
// Every cursor effect in the app checks this, so phones and reduced-motion users get none of them.
export function usePointerEffects() {
  const reduced = useReducedMotion()
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia(FINE_POINTER).matches)

  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER)
    const update = () => setFine(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return fine && !reduced
}

// Tracks the pointer inside an element as smooth values from -1 to 1.
// Children use these values to move a few pixels at different "depths" (parallax).
export function usePointerParallax() {
  const enabled = usePointerEffects()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 90, damping: 20, mass: 0.6 })
  const y = useSpring(my, { stiffness: 90, damping: 20, mass: 0.6 })

  function onPointerMove(event) {
    if (!enabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    mx.set(((event.clientX - rect.left) / rect.width - 0.5) * 2)
    my.set(((event.clientY - rect.top) / rect.height - 0.5) * 2)
  }

  function onPointerLeave() {
    mx.set(0)
    my.set(0)
  }

  return { x, y, bind: { onPointerMove, onPointerLeave } }
}
