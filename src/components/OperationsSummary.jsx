import { getRole } from '../data/aiRoles'
import PriorityBoard from './PriorityBoard'
import Icon from './Icon'

// Body of section 05: how the Operations Lead combined the other four reports.
export default function OperationsSummary({ response, onJump }) {
  if (response.failed) {
    return (
      <div className="ops">
        <p className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          <span>
            The Operations Lead did not finish{response.error ? `: ${response.error}` : '.'} There is no prioritized plan for this run. Review the four reports directly, or
            run the task again.
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="ops">
      <div className="ops-inputs">
        <h4 className="micro">What each role reported</h4>
        <ol className="ops-input-list">
          {response.roleSummaries.map(({ roleId, summary }) => (
            <li key={roleId} className={`role-${roleId}`}>
              <button type="button" className="ops-input" onClick={() => onJump(roleId)}>
                <span className="ops-input-name">{getRole(roleId)?.shortName}</span>
                <span>{summary}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <PriorityBoard priorities={response.priorities} />

      <div className="ops-next">
        <h4 className="micro">Recommended next steps</h4>
        <ol>
          {response.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
