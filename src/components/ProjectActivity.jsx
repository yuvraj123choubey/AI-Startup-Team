import { useEffect, useRef } from 'react'
import { getRole } from '../data/aiRoles'

const NAMES = { system: 'System', founder: 'Founder' }
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

// Live, time-stamped activity feed of a Build-mode project.
export default function ProjectActivity({ activity, live }) {
  const listRef = useRef(null)
  const count = activity.length

  // Keep the newest entry in view while the build runs, unless the founder scrolled up.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight
  }, [count])

  return (
    <div className="activity">
      <div className="runlog-head">
        <span className="micro">Live activity</span>
        {live && (
          <span className="processing" aria-label="The team is working">
            <span />
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
      <ol className="activity-list" ref={listRef} aria-live="polite">
        {activity.map((entry) => {
          const role = getRole(entry.roleId)
          return (
            <li key={entry.id} className={`activity-item is-${entry.type} ${role ? `role-${role.id}` : `kind-${entry.roleId}`}`}>
              <time>{time(entry.at)}</time>
              <span className="runlog-dot" />
              <span>
                <strong>{role ? role.shortName : NAMES[entry.roleId] || entry.roleId}</strong> {entry.text.replace(/^(Developer|Security|Finance|Legal|Operations) /, '')}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
