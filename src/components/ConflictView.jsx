import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getRole } from '../data/aiRoles'
import Icon from './Icon'

// Shows two sides of a disagreement facing each other, joined by lines that meet at "VS".
export default function ConflictView({ conflict, index, total }) {
  const reduced = useReducedMotion()
  const [hot, setHot] = useState(null)
  // What each role is optimizing for comes from that role's own stated position.
  const optimizes = { ...conflict.optimizes }
  conflict.sides.forEach((side) => {
    if (side.optimizesFor) optimizes[side.roleId] = side.optimizesFor
  })

  // Roles that took the same position are grouped on the same side.
  const groups = []
  conflict.sides.forEach((side) => {
    let group = groups.find((g) => g.value === side.value)
    if (!group) {
      group = { value: side.value, sides: [] }
      groups.push(group)
    }
    group.sides.push(side)
  })
  const [left, ...right] = groups

  const line = (dir) => (
    <motion.span
      className={`versus-line line-${dir} ${hot === dir ? 'is-hot' : ''}`}
      initial={{ scaleX: reduced ? 1 : 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1], delay: 0.2 }}
    />
  )

  return (
    <article className="conflict">
      <header className="conflict-head">
        <span className="conflict-flag">
          <Icon name="alert" size={16} />
          Different priorities detected
        </span>
        <span className="micro">
          Conflict {index + 1} of {total}
        </span>
      </header>
      <h3 className="conflict-topic">{conflict.label}</h3>

      <div className="versus">
        <Side group={left} onHover={(on) => setHot(on ? 'left' : null)} />
        <div className="versus-center" aria-hidden="true">
          {line('left')}
          <span className="versus-node">VS</span>
          {line('right')}
        </div>
        <div className="versus-right">
          {right.map((group) => (
            <Side key={group.value} group={group} onHover={(on) => setHot(on ? 'right' : null)} />
          ))}
        </div>
      </div>

      <div className="conflict-why">
        <div>
          <span className="micro">Why they disagree</span>
          <dl className="optimizes">
            {conflict.sides.map((side) => (
              <div key={side.roleId} className={`role-${side.roleId}`}>
                <dt>{getRole(side.roleId).shortName} optimizes</dt>
                <dd>{optimizes[side.roleId] || 'Its own responsibilities'}</dd>
              </div>
            ))}
          </dl>
          <p>{conflict.why}</p>
          {conflict.source === 'operations' && <p className="small muted">Identified by the Operations Lead from the reports.</p>}
        </div>
        <div className="conflict-decide">
          <span className="micro">Founder’s decision required · {[...new Set(conflict.sides.map((s) => getRole(s.roleId)?.shortName))].join(' vs ')}</span>
          {conflict.question && <p className="conflict-question">{conflict.question}</p>}
          <p className="small muted">
            These roles are optimizing for different goals. Review the assumptions before making a decision. The disagreement is useful: it shows a
            trade-off you would otherwise miss. The AI team will not pick a side.
          </p>
        </div>
      </div>
    </article>
  )
}

function Side({ group, onHover }) {
  return (
    <div className="versus-side" onPointerEnter={() => onHover(true)} onPointerLeave={() => onHover(false)}>
      {group.sides.map((side) => (
        <blockquote key={side.roleId} className={`versus-quote role-${side.roleId}`}>
          <cite className="micro">{getRole(side.roleId).name}</cite>
          <p>“{side.statement}”</p>
        </blockquote>
      ))}
    </div>
  )
}
