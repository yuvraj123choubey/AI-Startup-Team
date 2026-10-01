import { useState } from 'react'
import { getRole } from '../data/aiRoles'
import { CONFLICT_TOPICS } from '../services/conflictDetector'
import Icon from './Icon'
import SafetyNotice from './SafetyNotice'

const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  review: 'Professional review',
}

// The detailed body of one specialist role's report (shown inside a ResultSection).
export default function WorkerResponse({ response, roleId }) {
  const role = getRole(response.roleId || roleId)
  const [showPrompt, setShowPrompt] = useState(false)

  if (response.failed) {
    return (
      <div className="response">
        <p className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          <span>
            The {role.name} did not respond{response.error ? `: ${response.error}` : '.'} No answer was invented in its place. Run the task again, or switch the AI engine on the New
            Task page.
          </span>
        </p>
      </div>
    )
  }

  const positions = Object.entries(response.positions || {}).filter(([key]) => CONFLICT_TOPICS[key])

  return (
    <div className="response">
      {role.notice && <SafetyNotice text={role.notice} />}
      {response.estimates && <EstimateTable estimates={response.estimates} />}

      <div className="response-grid">
        {response.sections.map((section) => (
          <div key={section.title} className="response-block">
            <h4 className="micro">{section.title}</h4>
            <ul>
              {section.items.map((item) => (
                <li key={item}>
                  <SeverityText text={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {(response.risks?.length > 0 || positions.length > 0) && (
        <div className="response-foot">
          {response.risks?.length > 0 && (
            <div>
              <h4 className="micro">Risks</h4>
              <ul className="assumption-list">
                {response.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {positions.length > 0 && (
            <div>
              <h4 className="micro">Positions taken (used for conflict detection)</h4>
              <ul className="position-list">
                {positions.map(([key, p]) => (
                  <li key={key}>
                    <span className="position-topic">{CONFLICT_TOPICS[key].label}</span>
                    <strong>{CONFLICT_TOPICS[key].stances[p.value]}</strong>
                    <span className="muted small">{p.statement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="response-foot">
        <div>
          <h4 className="micro">Recommendations</h4>
          <ul className="rec-list">
            {response.recommendations.map((rec) => (
              <li key={rec.text}>
                <span className={`priority-tag priority-${rec.priority}`}>{PRIORITY_LABELS[rec.priority] || rec.priority}</span>
                <span>{rec.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="micro">Assumptions to verify</h4>
          <ul className="assumption-list">
            {response.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" className="text-button" onClick={() => setShowPrompt(!showPrompt)} aria-expanded={showPrompt}>
        <Icon name="chevronDown" size={16} className={showPrompt ? 'rotate' : ''} />
        {showPrompt ? 'Hide prompt' : 'Show the prompt this role received'}
      </button>
      {showPrompt &&
        (response.prompt ? (
          <pre className="prompt-box">{`[SYSTEM]\n${response.prompt.system}\n\n[USER]\n${response.prompt.user}`}</pre>
        ) : (
          <p className="muted small">The prompt was not saved with this report.</p>
        ))}
    </div>
  )
}

// Highlight "HIGH:", "MEDIUM:", "LOW:" prefixes in security findings.
function SeverityText({ text }) {
  const match = text.match(/^(HIGH|MEDIUM|LOW):\s*(.*)$/)
  if (!match) return text
  return (
    <>
      <span className={`severity severity-${match[1].toLowerCase()}`}>{match[1]}</span>
      {match[2]}
    </>
  )
}

function EstimateTable({ estimates }) {
  const money = (n) => '$' + n.toLocaleString('en-US')
  return (
    <div className="table-wrap">
      <table className="estimate-table">
        <caption className="micro">Cost estimates (not quotes)</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Estimate</th>
            <th scope="col">Per</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {estimates.rows.map((row) => (
            <tr key={row.item}>
              <td>{row.item}</td>
              <td className="num">{row.display || `${money(row.low)}–${money(row.high)}`}</td>
              <td>{row.period}</td>
              <td className="muted">{row.note || ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Monthly total (estimate)</th>
            <td className="num">
              {money(estimates.monthlyLow)}–{money(estimates.monthlyHigh)}
            </td>
            <td>month</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
