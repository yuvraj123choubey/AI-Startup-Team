import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { AI_ROLES } from '../data/aiRoles'
import { usePointerParallax } from '../hooks/usePointer'
import Parallax from './motion/Parallax'
import AgentNode from './AgentNode'
import Icon from './Icon'

// Coordinates live in a 1000 × 800 space. The SVG uses the same viewBox,
// so HTML nodes placed at (x/10 %, y/8 %) sit exactly on the line ends.
const FOUNDER = { x: 500, y: 80 }
const HUB = { x: 500, y: 320 }
const POSITIONS = {
  developer: { x: 130, y: 560, tip: 'start' },
  security: { x: 310, y: 680, tip: 'center' },
  finance: { x: 500, y: 722, tip: 'center' },
  legal: { x: 690, y: 680, tip: 'center' },
  operations: { x: 870, y: 560, tip: 'end' },
}

const pct = (p) => ({ left: `${p.x / 10}%`, top: `${p.y / 8}%` })
const hubPath = (p) => `M${HUB.x} ${HUB.y} C${HUB.x} ${HUB.y + 150}, ${p.x} ${p.y - 170}, ${p.x} ${p.y}`

// Hero visual: Founder → shared company context → five AI roles.
export default function AgentNetwork({ getStatus, briefName, running, onSelectRole }) {
  const { x, y, bind } = usePointerParallax()
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(null)

  return (
    <div className={`network ${running ? 'is-running' : ''} ${hovered ? 'has-hover' : ''}`} {...bind}>
      <Parallax x={x} y={y} depth={2} className="network-layer">
        <svg viewBox="0 0 1000 800" className="network-svg" aria-hidden="true">
          <defs>
            <radialGradient id="hub-glow">
              <stop offset="0%" stopColor="rgba(150,185,245,0.28)" />
              <stop offset="100%" stopColor="rgba(150,185,245,0)" />
            </radialGradient>
          </defs>
          <circle cx={HUB.x} cy={HUB.y} r="170" fill="url(#hub-glow)" />

          <path className="net-line net-line-main" d={`M${FOUNDER.x} ${FOUNDER.y} L${HUB.x} ${HUB.y}`} />
          <path className="net-flow net-flow-main" d={`M${FOUNDER.x} ${FOUNDER.y} L${HUB.x} ${HUB.y}`} />
          {!reduced && (
            <circle r="4" className="net-signal net-signal-main">
              <animateMotion dur="2.6s" repeatCount="indefinite" path={`M${FOUNDER.x} ${FOUNDER.y} L${HUB.x} ${HUB.y}`} />
            </circle>
          )}

          {AI_ROLES.map((role, i) => {
            const d = hubPath(POSITIONS[role.id])
            const status = getStatus(role.id)
            const state = hovered === role.id ? 'is-hot' : hovered ? 'is-faded' : ''
            return (
              <g key={role.id} className={`net-link role-${role.id} is-${status} ${state}`}>
                <path className="net-line" d={d} />
                <path className="net-flow" d={d} />
                {!reduced && (
                  <circle r="3.5" className="net-signal">
                    {/* negative begin = already mid-loop, so no dot waits at the SVG origin */}
                    <animateMotion dur={`${3.2 + i * 0.3}s`} begin={`-${i * 0.65}s`} repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
      </Parallax>

      <Parallax x={x} y={y} depth={4} className="net-anchor" style={pct(FOUNDER)}>
        <div className="net-founder">
          <span className="net-founder-icon">
            <Icon name="user" size={18} />
          </span>
          <span>
            <span className="net-kicker">Founder</span>
            <span className="net-caption">Gives the task · makes the call</span>
          </span>
        </div>
      </Parallax>

      <Parallax x={x} y={y} depth={3} className="net-anchor" style={pct(HUB)}>
        <div className="net-hub">
          <span className="net-hub-orbit" aria-hidden="true" />
          <span className="net-kicker">Shared context</span>
          <span className="net-hub-name">{briefName || 'Company Brief'}</span>
        </div>
      </Parallax>

      {AI_ROLES.map((role, i) => {
        const p = POSITIONS[role.id]
        return (
          <Parallax key={role.id} x={x} y={y} depth={5 + (i % 3)} className="net-anchor" style={pct(p)}>
            <AgentNode
              role={role}
              status={getStatus(role.id)}
              dimmed={hovered !== null && hovered !== role.id}
              highlighted={hovered === role.id}
              onHoverChange={(on) => setHovered(on ? role.id : null)}
              onClick={() => onSelectRole(role.id)}
            >
              <span className={`agent-tip tip-${p.tip}`} aria-hidden="true">
                <span className="agent-tip-name">{role.name}</span>
                <span className="agent-tip-desc">{role.description}</span>
              </span>
            </AgentNode>
          </Parallax>
        )
      })}
    </div>
  )
}
