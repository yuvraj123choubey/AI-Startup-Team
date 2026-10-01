import { PROJECT_STATUS } from '../services/projectService'

// Status pill: BUILDING · COMPLETE · REVIEW REQUIRED · FAILED …
export default function ProjectStatus({ status, large = false }) {
  const info = PROJECT_STATUS[status] || { label: status, tone: 'pending' }
  return (
    <span className={`project-status tone-${info.tone} ${large ? 'is-large' : ''}`} role="status">
      <span className="status-dot" />
      {info.label}
    </span>
  )
}
