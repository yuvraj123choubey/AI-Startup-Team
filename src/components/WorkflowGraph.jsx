import { getRole } from '../data/aiRoles'
import WorkflowLine from './WorkflowLine'
import WorkflowNode from './WorkflowNode'

// Layout of the multi-agent workflow (560 × 700 space):
//
//   Founder task → Developer → (Security | Finance) → Legal → Operations → Final brief
//
// Security and Finance are drawn as two branches because both review the
// Developer's plan from different angles. The engine still runs them in order.
const W = 560
const H = 700
const NODES = {
  task: { x: 280, y: 50 },
  developer: { x: 280, y: 170 },
  security: { x: 128, y: 305 },
  finance: { x: 432, y: 305 },
  legal: { x: 280, y: 440 },
  operations: { x: 280, y: 555 },
  brief: { x: 280, y: 660 },
}
const EDGES = [
  { from: 'task', to: 'developer' },
  { from: 'developer', to: 'security' },
  { from: 'developer', to: 'finance' },
  { from: 'security', to: 'legal' },
  { from: 'finance', to: 'legal' },
  { from: 'legal', to: 'operations' },
  { from: 'operations', to: 'brief' },
]
const ROLE_STAGES = ['developer', 'security', 'finance', 'legal', 'operations']

function edgePath(a, b) {
  if (a.x === b.x) return `M${a.x} ${a.y} L${b.x} ${b.y}`
  const mid = (a.y + b.y) / 2
  return `M${a.x} ${a.y} C${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`
}

const place = (p) => ({ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` })

// Map worker status (from App.jsx or a Build-mode project) to a visual stage status.
function stageStatus(workerStatus) {
  return { ready: 'idle', waiting: 'pending', working: 'active', done: 'done', failed: 'failed', warning: 'warning' }[workerStatus] || 'idle'
}

// getNote (optional) overrides a stage's status text, e.g. "Fixing 3 security issues (round 1)".
// startLabel/endLabel let Build mode reuse the same graph ("Finished project" instead of "Final brief").
export default function WorkflowGraph({ getStatus, getNote, running, finished, decided, startLabel = 'Founder task', startSub, endLabel = 'Final brief', endSub, endStatus }) {
  const stages = {}
  ROLE_STAGES.forEach((id) => {
    const role = getRole(id)
    const status = stageStatus(getStatus(id))
    stages[id] = {
      label: role.shortName,
      roleId: id,
      status,
      sub: getNote?.(id) || { idle: 'Standing by', pending: 'Queued', active: `${role.activeVerb}…`, done: 'Complete', failed: 'Failed', warning: 'Needs review' }[status],
    }
  })
  stages.task = {
    label: startLabel,
    kind: 'founder',
    status: running || finished ? 'done' : 'idle',
    sub: startSub || (running || finished ? 'Submitted' : 'Waiting for a task'),
  }
  stages.brief = {
    label: endLabel,
    kind: 'founder',
    status: endStatus || (finished ? (decided ? 'done' : 'ready') : 'pending'),
    sub: endSub || (finished ? (decided ? 'Decision recorded' : 'Awaiting founder review') : 'Founder decides'),
  }

  function edgeState(to) {
    const s = stages[to].status
    if (s === 'active') return 'active'
    if (s === 'done' || s === 'ready' || s === 'warning' || s === 'failed') return 'done'
    return 'pending'
  }

  const order = ['task', ...ROLE_STAGES, 'brief']

  return (
    <div className={`workflow-graph ${running ? 'is-running' : ''} ${finished ? 'is-finished' : ''}`}>
      {/* Desktop / tablet: branching graph */}
      <div className="wf-canvas" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="wf-svg" aria-hidden="true">
          {EDGES.map((e) => (
            <WorkflowLine
              key={`${e.from}-${e.to}`}
              d={edgePath(NODES[e.from], NODES[e.to])}
              state={edgeState(e.to)}
              className={ROLE_STAGES.includes(e.to) ? `role-${e.to}` : 'to-brief'}
            />
          ))}
        </svg>
        {order.map((id) => (
          <WorkflowNode key={id} {...stages[id]} style={place(NODES[id])} />
        ))}
      </div>

      {/* Mobile: the same stages as a vertical list */}
      <ol className="wf-list">
        {order.map((id) => (
          <li key={id} className={`wf-list-item is-${stages[id].status} ${stages[id].roleId ? `role-${id}` : 'kind-founder'}`}>
            <WorkflowNode {...stages[id]} />
          </li>
        ))}
      </ol>
    </div>
  )
}
