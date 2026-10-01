import Icon from './Icon'
import { statusLabel } from '../utils/status'

// One AI worker drawn as a glowing orb with a label.
// Used by the dashboard network and the AI Team system map.
export default function AgentNode({
  role,
  status = 'ready',
  size = 'md',
  step,
  dimmed = false,
  highlighted = false,
  onClick,
  onHoverChange,
  children,
}) {
  return (
    <button
      type="button"
      className={`agent-node size-${size} role-${role.id} is-${status} ${dimmed ? 'is-dimmed' : ''} ${highlighted ? 'is-highlighted' : ''}`}
      onClick={onClick}
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      aria-label={`${role.name}: ${statusLabel(role, status)}. Open details.`}
    >
      <span className="agent-orb">
        <span className="agent-halo" aria-hidden="true" />
        <Icon name={status === 'done' ? 'check' : role.icon} size={size === 'lg' ? 24 : 20} />
      </span>
      <span className="agent-label">
        {step && <span className="agent-step">{step}</span>}
        <span className="agent-name">{role.shortName}</span>
        <span className="agent-status">{statusLabel(role, status)}</span>
      </span>
      {children}
    </button>
  )
}
