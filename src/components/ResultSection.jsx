import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Icon from './Icon'

// An editorial, expandable section: large number, title, one-line summary.
export default function ResultSection({ id, number, title, roleName, roleId, summary, failed = false, open, onToggle, children }) {
  const reduced = useReducedMotion()
  const bodyId = `${id}-body`

  return (
    <section id={id} className={`result-section role-${roleId} ${open ? 'is-open' : ''} ${failed ? 'is-failed' : ''}`}>
      <button type="button" className="result-head" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="result-num">{number}</span>
        <span className="result-titles">
          <span className="micro result-role">
            {roleName}
            {failed && <span className="failed-tag">Failed</span>}
          </span>
          <span className="result-title">{title}</span>
          <span className="result-summary">{summary}</span>
        </span>
        <span className="result-toggle" aria-hidden="true">
          <Icon name={open ? 'minus' : 'plusThin'} size={18} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={bodyId}
            key="body"
            className="result-body-wrap"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="result-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
