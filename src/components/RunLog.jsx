import { AnimatePresence, motion } from 'motion/react'
import { getRole } from '../data/aiRoles'

// Live, time-stamped log of the team's progress, shown beside the workflow graph.
export default function RunLog({ log, running }) {
  return (
    <div className="runlog">
      <div className="runlog-head">
        <span className="micro">Run log</span>
        {running && (
          <span className="processing" aria-label="AI team is processing">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
      {log.length === 0 ? (
        <p className="runlog-empty">Events appear here once the team starts working.</p>
      ) : (
        <ol className="runlog-list">
          <AnimatePresence initial={false}>
            {log.map((entry) => {
              const role = getRole(entry.roleId)
              return (
                <motion.li
                  key={entry.id}
                  className={`runlog-item role-${role.id} is-${entry.type}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <time>{entry.time}</time>
                  <span className="runlog-dot" />
                  <span>
                    <strong>{role.shortName}</strong> {entry.text}
                  </span>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}
