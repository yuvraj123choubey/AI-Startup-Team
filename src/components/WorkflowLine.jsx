import { motion, useReducedMotion } from 'motion/react'

// One connection in the workflow graph.
// pending = dim track · active = path draws itself with a travelling pulse · done = quiet solid line
export default function WorkflowLine({ d, state, className = '' }) {
  const reduced = useReducedMotion()
  const drawn = state !== 'pending'

  return (
    <g className={`wf-line is-${state} ${className}`}>
      <path d={d} className="wf-track" />
      <motion.path
        d={d}
        className="wf-fill"
        initial={false}
        animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : state === 'active' ? 0.9 : 0.5, ease: [0.65, 0, 0.35, 1] }}
      />
      {state === 'active' && <path d={d} className="wf-flow" />}
      {state === 'active' && !reduced && (
        <circle r="4.5" className="wf-pulse">
          <animateMotion dur="1.3s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  )
}
