import { AI_ROLES } from '../data/aiRoles'
import { statusLabel } from '../utils/status'
import { RevealGroup, RevealItem } from './motion/Reveal'
import Icon from './Icon'

// The five workers as an editorial list. Hovering a row reveals its responsibilities.
export default function TeamRoster({ getStatus, onOpen }) {
  return (
    <RevealGroup as="ol" className="roster">
      {AI_ROLES.map((role, i) => {
        const status = getStatus(role.id)
        return (
          <RevealItem as="li" key={role.id} className={`roster-row role-${role.id} is-${status}`}>
            <button type="button" className="roster-button" onClick={() => onOpen(role.id)}>
              <span className="roster-num">0{i + 1}</span>
              <span className="roster-main">
                <span className="roster-name">{role.name}</span>
                <span className="roster-desc">{role.description}</span>
                <span className="roster-duties">
                  <span className="roster-duties-inner">
                    {role.responsibilities.map((duty) => (
                      <span key={duty} className="roster-duty">
                        {duty}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              <span className="roster-status">
                <span className="status-dot" />
                {statusLabel(role, status)}
              </span>
              <span className="roster-go" aria-hidden="true">
                <Icon name="arrowRight" size={18} />
              </span>
            </button>
          </RevealItem>
        )
      })}
    </RevealGroup>
  )
}
