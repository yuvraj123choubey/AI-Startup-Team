import { getRole } from '../data/aiRoles'
import Icon from './Icon'

const COLUMNS = [
  { key: 'high', title: 'High priority' },
  { key: 'medium', title: 'Medium priority' },
  { key: 'low', title: 'Low priority' },
  { key: 'review', title: 'Needs professional review', icon: 'flag' },
]

// The Operations Lead's combined task list, grouped by priority.
export default function PriorityBoard({ priorities }) {
  // Number items continuously across columns (1, 2, 3… from High down to Review).
  const startNumbers = {}
  let next = 1
  COLUMNS.forEach((column) => {
    startNumbers[column.key] = next
    next += priorities[column.key].length
  })

  return (
    <div className="priority-board">
      {COLUMNS.map((column) => (
        <div key={column.key} className={`priority-col priority-col-${column.key}`}>
          <h4 className="priority-head">
            <span className="priority-mark" />
            {column.icon && <Icon name={column.icon} size={14} />}
            {column.title}
            <span className="count">{priorities[column.key].length}</span>
          </h4>
          {priorities[column.key].length === 0 ? (
            <p className="muted small">Nothing here.</p>
          ) : (
            <ol>
              {priorities[column.key].map((item, index) => (
                <li key={`${item.text}-${index}`} className={item.isDecision ? 'is-decision' : ''}>
                  <span className="item-num">{startNumbers[column.key] + index}</span>
                  <span className="item-body">
                    <span>{item.text}</span>
                    <span className="item-from">
                      {(item.from || []).filter(getRole).map((roleId) => (
                        <span key={roleId} className={`from-tag role-${roleId}`}>
                          {getRole(roleId).shortName}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}
