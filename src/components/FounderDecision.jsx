import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import MagneticButton from './motion/MagneticButton'
import Icon from './Icon'

const CHOICES = [
  { id: 'approve', label: 'Approve the plan' },
  { id: 'changes', label: 'Approve with changes' },
  { id: 'more-info', label: 'Ask the team for more' },
  { id: 'reject', label: 'Reject / reconsider' },
]

const STATUS_TEXT = {
  awaiting: 'Awaiting founder review',
  reviewed: 'Reviewed · choose a decision',
  complete: 'Complete · decision recorded',
}

// The human checkpoint: AI output → Verify → Compare → Human decision.
// Each step lights up (and draws its line to the next) as it scrolls into view.
// The workflow is only complete once the founder confirms the review and records a decision.
export default function FounderDecision({ decision, onRecord, reportCount, actionCount, conflictCount, reviewCount }) {
  const reduced = useReducedMotion()

  const [reviewed, setReviewed] = useState(false)
  const [choice, setChoice] = useState('')
  const [note, setNote] = useState('')
  const status = decision ? 'complete' : reviewed ? 'reviewed' : 'awaiting'

  const steps = [
    { label: 'AI output', detail: `${reportCount} role reports and ${actionCount} suggested actions. Treat all of it as a draft.` },
    { label: 'Verify', detail: 'Check facts, prices, and legal points against real sources. Confirm every listed assumption.' },
    {
      label: 'Compare',
      detail: conflictCount
        ? `${conflictCount} disagreement${conflictCount > 1 ? 's' : ''} between roles to weigh${reviewCount ? `, plus ${reviewCount} item${reviewCount > 1 ? 's' : ''} for a professional` : ''}.`
        : 'Weigh the trade-offs between the roles’ recommendations.',
    },
  ]

  function handleSubmit(event) {
    event.preventDefault()
    if (!reviewed || !choice) return
    onRecord({ reviewed, choice, note: note.trim(), recordedAt: new Date().toISOString() })
  }

  return (
    <section id="result-decision" className={`decision is-${status}`}>
      <header className="decision-head">
        <div>
          <span className="micro">Human decision checkpoint</span>
          <h2 className="display-m">The last step is yours.</h2>
        </div>
        <span className={`workflow-status is-${status}`} role="status">
          <span className="status-dot" />
          {STATUS_TEXT[status]}
        </span>
      </header>

      <div className="decision-track">
        <ol className="decision-steps">
          {steps.map((step, i) => (
            <DecisionStep key={step.label} index={i} {...step} />
          ))}

          <li className="decision-final">
            <span className="decision-marker is-final" aria-hidden="true">
              <Icon name="user" size={20} />
            </span>
            <div className="decision-final-card">
              <span className="micro">Step 04</span>
              <h3 className="display-l">Human decision</h3>
              <p className="decision-statement">
                The system provides recommendations.
                <br />
                <strong>The founder remains responsible for the final decision.</strong>
              </p>
              <p className="decision-never">Nothing moves from AI output straight to action. Nothing is built, bought, or signed automatically.</p>

              {decision ? (
                <motion.div className="decision-recorded" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Icon name="check" size={20} />
                  <div>
                    <strong>{CHOICES.find((c) => c.id === decision.choice)?.label}</strong>
                    <span>
                      Recorded by the founder · {new Date(decision.recordedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    {decision.note && <span className="decision-note">“{decision.note}”</span>}
                  </div>
                </motion.div>
              ) : (
                <form className="decision-form" onSubmit={handleSubmit}>
                  <label className={`check ${reviewed ? 'is-checked' : ''}`} htmlFor="decision-reviewed">
                    <input
                      id="decision-reviewed"
                      type="checkbox"
                      className="check-input"
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                    />
                    <span className="check-box" aria-hidden="true">
                      <svg viewBox="0 0 20 20">
                        <motion.path
                          d="M4.5 10.5l3.5 3.5 7.5-8"
                          initial={false}
                          animate={{ pathLength: reviewed ? 1 : 0 }}
                          transition={{ duration: reduced ? 0 : 0.3 }}
                        />
                      </svg>
                    </span>
                    <span>
                      I reviewed the AI recommendations.
                      <span className="check-sub">The workflow will not be marked complete until this is confirmed.</span>
                    </span>
                  </label>

                  <fieldset disabled={!reviewed} className="choices">
                    <legend className="micro">Your decision</legend>
                    <div className="choice-row">
                      {CHOICES.map((c) => (
                        <label key={c.id} htmlFor={`choice-${c.id}`} className={`choice ${choice === c.id ? 'is-selected' : ''}`}>
                          <input
                            id={`choice-${c.id}`}
                            type="radio"
                            name="decision"
                            value={c.id}
                            checked={choice === c.id}
                            onChange={() => setChoice(c.id)}
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                    <label htmlFor="decision-note" className="micro">
                      Notes (optional)
                    </label>
                    <textarea
                      id="decision-note"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Use a managed auth provider. Ask an attorney about the privacy policy."
                    />
                  </fieldset>

                  <div className="form-row">
                    <MagneticButton type="submit" arrow disabled={!reviewed || !choice}>
                      Record my decision
                    </MagneticButton>
                    <span className="hint">{!reviewed ? 'Confirm the review first.' : !choice ? 'Choose a decision.' : 'Ready to record.'}</span>
                  </div>
                </form>
              )}
            </div>
          </li>
        </ol>
      </div>
    </section>
  )
}

function DecisionStep({ index, label, detail }) {
  const ref = useRef(null)
  const lit = useInView(ref, { once: true, margin: '0px 0px -30% 0px' })
  return (
    <li ref={ref} className={`decision-step ${lit ? 'is-lit' : ''}`}>
      <span className="decision-marker" aria-hidden="true">
        {index + 1}
      </span>
      <div>
        <span className="decision-label">{label}</span>
        <p>{detail}</p>
      </div>
      <span className="decision-arrow" aria-hidden="true">
        <Icon name="arrowDown" size={16} />
      </span>
    </li>
  )
}
