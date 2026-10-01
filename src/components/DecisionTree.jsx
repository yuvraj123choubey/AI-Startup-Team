import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DECISION_TREE } from '../data/troubleshooting'
import MagneticButton from './motion/MagneticButton'
import Icon from './Icon'

// Build the "No" chain once: start → missingInfo → tooBroad → final step.
const CHAIN = []
let cursor = 'start'
while (DECISION_TREE[cursor]?.question) {
  CHAIN.push(cursor)
  cursor = DECISION_TREE[cursor].no
}
const FINAL_NO = cursor

// Interactive "Is the AI answer useful?" tree, with a live map of the whole tree beside it.
export default function DecisionTree() {
  const reduced = useReducedMotion()
  const [path, setPath] = useState([])

  const currentId = path.length ? path[path.length - 1].next : 'start'
  const current = DECISION_TREE[currentId]
  const visited = new Set(['start', ...path.map((p) => p.next)])

  function answer(choice) {
    setPath([...path, { nodeId: currentId, question: current.question, choice, next: current[choice] }])
  }

  return (
    <div className="tree">
      <div className="tree-stage">
        {path.length > 0 && (
          <ol className="tree-trail">
            {path.map((step) => (
              <li key={step.nodeId}>
                <span>{step.question}</span>
                <span className={`tree-answer is-${step.choice}`}>{step.choice === 'yes' ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ol>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentId}
            className="tree-card"
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: 0.28 }}
          >
            {current.question ? (
              <>
                <span className="micro">Question {path.length + 1}</span>
                <p className="tree-question">{current.question}</p>
                <div className="tree-actions">
                  <MagneticButton variant="ghost" className="btn-yes" onClick={() => answer('yes')}>
                    Yes
                  </MagneticButton>
                  <MagneticButton variant="ghost" className="btn-no" onClick={() => answer('no')}>
                    No
                  </MagneticButton>
                </div>
              </>
            ) : (
              <div className={`tree-outcome tone-${current.tone}`} role="status">
                <span className="micro">Next step</span>
                <ol>
                  {current.steps.map((step, i) => (
                    <li key={step}>
                      {i > 0 && <Icon name="arrowRight" size={18} />}
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {path.length > 0 && (
          <button type="button" className="text-button" onClick={() => setPath([])}>
            <Icon name="refresh" size={16} />
            Start over
          </button>
        )}
      </div>

      <div className="tree-map" aria-hidden="true">
        <span className="micro">The whole tree</span>
        {CHAIN.map((id) => {
          const node = DECISION_TREE[id]
          return (
            <div key={id} className="tree-map-row">
              <span className={`tree-map-q ${visited.has(id) ? 'is-visited' : ''} ${currentId === id ? 'is-current' : ''}`}>{node.question}</span>
              <span className={`tree-map-yes ${currentId === node.yes ? 'is-current' : ''}`}>
                <span className="tree-map-tag">Yes</span>
                {DECISION_TREE[node.yes].steps.join(' → ')}
              </span>
              <span className="tree-map-no">No ↓</span>
            </div>
          )
        })}
        <span className={`tree-map-final ${currentId === FINAL_NO ? 'is-current' : ''}`}>{DECISION_TREE[FINAL_NO].steps.join(' → ')}</span>
      </div>
    </div>
  )
}
