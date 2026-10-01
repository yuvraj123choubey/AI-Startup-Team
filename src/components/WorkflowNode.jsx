import { motion, useReducedMotion } from 'motion/react'
import Icon from './Icon'

// One stage in the workflow graph.
// status: 'idle' | 'pending' | 'active' | 'done' | 'ready' | 'warning' | 'failed'
export default function WorkflowNode({ label, sub, status, roleId, kind = 'agent', style }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={`wf-node kind-${kind} is-${status} ${roleId ? `role-${roleId}` : ''}`}
      style={style}
      animate={{ scale: status === 'active' && !reduced ? 1.06 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <span className="wf-indicator" aria-hidden="true">
        {status === 'done' && <Icon name="check" size={14} />}
        {status === 'active' && <span className="wf-spinner" />}
        {status === 'ready' && <Icon name="flag" size={14} />}
        {(status === 'failed' || status === 'warning') && <Icon name="alert" size={13} />}
        {(status === 'pending' || status === 'idle') && <span className="wf-dot" />}
      </span>
      <span className="wf-text">
        <span className="wf-name">{label}</span>
        <span className="wf-status" aria-live={status === 'active' ? 'polite' : undefined}>
          {sub}
        </span>
      </span>
    </motion.div>
  )
}
