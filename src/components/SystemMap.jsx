import { useReducedMotion } from 'motion/react'
import { AI_ROLES } from '../data/aiRoles'
import { usePointerParallax } from '../hooks/usePointer'
import Parallax from './motion/Parallax'
import AgentNode from './AgentNode'

// Five agents placed around the founder's task (1000 × 720 coordinate space).
const CENTER = { x: 500, y: 360 }
const POSITIONS = {
  developer: { x: 500, y: 90 },
  security: { x: 170, y: 300 },
  finance: { x: 830, y: 300 },
  legal: { x: 300, y: 630 },
  operations: { x: 700, y: 630 },
}
const RING = ['developer', 'finance', 'operations', 'legal', 'security']

const pct = (p) => ({ left: `${p.x / 10}%`, top: `${(p.y / 720) * 100}%` })

export default function SystemMap({ getStatus, briefName, hovered, onHover, onSelect }) {
  const { x, y, bind } = usePointerParallax()
  const reduced = useReducedMotion()
  const ring = RING.map((id) => `${POSITIONS[id].x},${POSITIONS[id].y}`).join(' ')

  return (
    <div className={`system-map ${hovered ? 'has-hover' : ''}`} {...bind}>
      <Parallax x={x} y={y} depth={2} className="map-layer">
        <svg viewBox="0 0 1000 720" className="map-svg" aria-hidden="true">
          <polygon points={ring} className="map-ring" />
          {AI_ROLES.map((role) => {
            const p = POSITIONS[role.id]
            const d = `M${CENTER.x} ${CENTER.y} L${p.x} ${p.y}`
            const state = hovered === role.id ? 'is-hot' : hovered ? 'is-faded' : ''
            return (
              <g key={role.id} className={`map-link role-${role.id} is-${getStatus(role.id)} ${state}`}>
                <path className="map-line" d={d} />
                <path className="map-flow" d={d} />
                {!reduced && hovered === role.id && (
                  <circle r="4" className="map-signal">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
      </Parallax>

      <Parallax x={x} y={y} depth={3} className="map-anchor map-center-anchor" style={pct(CENTER)}>
        <div className="map-center">
          <span className="map-center-orbit" aria-hidden="true" />
          <span className="map-center-kicker">Founder / Task</span>
          <span className="map-center-name">{briefName || 'Your startup'}</span>
          <span className="map-center-note">Every role reads the same brief</span>
        </div>
      </Parallax>

      {AI_ROLES.map((role, i) => (
        <Parallax key={role.id} x={x} y={y} depth={5 + (i % 2) * 2} className="map-anchor" style={pct(POSITIONS[role.id])}>
          <AgentNode
            role={role}
            size="lg"
            step={`0${i + 1}`}
            status={getStatus(role.id)}
            dimmed={hovered !== null && hovered !== role.id}
            highlighted={hovered === role.id}
            onHoverChange={(on) => onHover(on ? role.id : null)}
            onClick={() => onSelect(role.id)}
          />
        </Parallax>
      ))}
    </div>
  )
}
