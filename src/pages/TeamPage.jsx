import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AI_ROLES, WORKFLOW_ORDER, getRole } from '../data/aiRoles'
import { statusLabel } from '../utils/status'
import AnimatedPage from '../components/motion/AnimatedPage'
import SystemMap from '../components/SystemMap'
import AgentPanel from '../components/AgentPanel'
import Icon from '../components/Icon'

export default function TeamPage({ getStatus, briefName, focusRole }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(focusRole || null)
  const closePanel = useCallback(() => setSelected(null), [])

  const inspected = hovered ? getRole(hovered) : null

  return (
    <AnimatedPage className="page-team">
      <header className="page-intro">
        <span className="micro">System map</span>
        <h1 className="display-l">AI Team</h1>
        <p className="lede">
          Five agents around one task. Each has its own responsibilities and its own system prompt, defined in <code>src/data/aiRoles.js</code>.
        </p>
      </header>

      <div className="team-layout">
        <SystemMap getStatus={getStatus} briefName={briefName} hovered={hovered} onHover={setHovered} onSelect={setSelected} />

        <aside className="inspector" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {inspected ? (
              <motion.div
                key={inspected.id}
                className={`inspector-body role-${inspected.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <span className="micro inspector-step">
                  Step 0{WORKFLOW_ORDER.indexOf(inspected.id) + 1} · {statusLabel(inspected, getStatus(inspected.id))}
                </span>
                <h2 className="inspector-name">{inspected.name}</h2>
                <p className="inspector-desc">{inspected.description}</p>
                <ul className="inspector-duties">
                  {inspected.responsibilities.map((duty, i) => (
                    <motion.li key={duty} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                      {duty}
                    </motion.li>
                  ))}
                </ul>
                <span className="inspector-hint">Click the node for its full profile and system prompt.</span>
              </motion.div>
            ) : (
              <motion.div key="empty" className="inspector-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="micro">Inspector</span>
                <p className="inspector-desc">Hover or focus a role to see what it owns. Click it to open its full profile.</p>
                <ol className="inspector-order">
                  {AI_ROLES.map((role, i) => (
                    <li key={role.id} className={`role-${role.id}`}>
                      <button type="button" className="text-button" onClick={() => setSelected(role.id)}>
                        <span className="order-num">0{i + 1}</span>
                        {role.name}
                        <Icon name="arrowRight" size={14} />
                      </button>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <AgentPanel roleId={selected} getStatus={getStatus} onClose={closePanel} onChange={setSelected} />
    </AnimatedPage>
  )
}
