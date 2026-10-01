import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AI_ROLES, WORKFLOW_ORDER, getRole } from '../data/aiRoles'
import { statusLabel } from '../utils/status'
import SafetyNotice from './SafetyNotice'
import Icon from './Icon'

// Side panel with one role's full description and system prompt.
// Rendered into <body> so page transitions never affect its position.
export default function AgentPanel({ roleId, getStatus, onClose, onChange }) {
  const reduced = useReducedMotion()
  const closeRef = useRef(null)
  const role = roleId ? getRole(roleId) : null

  useEffect(() => {
    if (!roleId) return
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [roleId, onClose])

  const index = role ? WORKFLOW_ORDER.indexOf(role.id) : -1
  const before = index > 0 ? getRole(WORKFLOW_ORDER[index - 1]) : null
  const after = index >= 0 && index < WORKFLOW_ORDER.length - 1 ? getRole(WORKFLOW_ORDER[index + 1]) : null

  return createPortal(
    <AnimatePresence>
      {role && (
        <>
          <motion.div
            key="backdrop"
            className="panel-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            key="panel"
            className={`panel role-${role.id}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            initial={reduced ? { opacity: 0 } : { x: '100%' }}
            animate={reduced ? { opacity: 1 } : { x: 0 }}
            exit={reduced ? { opacity: 0 } : { x: '100%' }}
            transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 36 }}
          >
            <div className="panel-top">
              <span className="micro">
                Step 0{index + 1} of 05 · {statusLabel(role, getStatus(role.id))}
              </span>
              <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close panel">
                <Icon name="close" size={18} />
              </button>
            </div>

            <motion.div
              key={role.id}
              className="panel-body"
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <span className="panel-orb">
                <Icon name={role.icon} size={26} />
              </span>
              <h2 id="panel-title" className="panel-title">
                {role.name}
              </h2>
              <p className="panel-lede">{role.description}</p>

              <div className="panel-flow">
                <div>
                  <span className="micro">Receives</span>
                  <span>{before ? `${before.name}’s output` : 'The founder’s task + Company Brief'}</span>
                </div>
                <Icon name="arrowRight" size={16} />
                <div>
                  <span className="micro">Hands off to</span>
                  <span>{after ? after.name : 'The founder, for the final decision'}</span>
                </div>
              </div>

              <div className="panel-section">
                <span className="micro">Responsibilities</span>
                <ul className="panel-duties">
                  {role.responsibilities.map((duty) => (
                    <li key={duty}>{duty}</li>
                  ))}
                </ul>
              </div>

              {role.notice && <SafetyNotice text={role.notice} />}

              <div className="panel-section">
                <span className="micro">Analyze mode prompt{role.capabilities ? ` · ${role.capabilities.join(' + ')}` : ''}</span>
                <pre className="prompt-box">{role.systemPrompt}</pre>
              </div>

              {role.buildPrompt && (
                <div className="panel-section">
                  <span className="micro">Build mode prompt</span>
                  <pre className="prompt-box">{role.buildPrompt}</pre>
                </div>
              )}
            </motion.div>

            <div className="panel-nav">
              <button type="button" className="text-button" disabled={!before} onClick={() => onChange(before.id)}>
                <Icon name="arrowLeft" size={16} />
                {before ? before.shortName : 'First role'}
              </button>
              <span className="panel-dots" aria-hidden="true">
                {AI_ROLES.map((r) => (
                  <span key={r.id} className={`role-${r.id} ${r.id === role.id ? 'is-on' : ''}`} />
                ))}
              </span>
              <button type="button" className="text-button" disabled={!after} onClick={() => onChange(after.id)}>
                {after ? after.shortName : 'Last role'}
                <Icon name="arrowRight" size={16} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
