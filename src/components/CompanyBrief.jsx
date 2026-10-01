import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AI_ROLES } from '../data/aiRoles'
import { BRIEF_FIELDS, BRIEF_SECTIONS, EMPTY_BRIEF, SAMPLE_BRIEF } from '../data/sampleBrief'
import MagneticButton from './motion/MagneticButton'
import Icon from './Icon'
import { loadFromStorage, saveToStorage } from '../utils/storage'

const FIELDS = Object.fromEntries(BRIEF_FIELDS.map((f) => [f.key, f]))
const REVIEW_STEP = BRIEF_SECTIONS.length
const filled = (value) => String(value || '').trim().length > 0
// Unsaved edits survive a page refresh; the saved brief itself is stored by App.jsx.
const DRAFT_KEY = 'ai-startup-team.briefDraft'

// Company Brief as a six-step setup, like configuring an AI organization.
// Changes stay in a draft until the founder saves them on the final step.
export default function CompanyBrief({ brief, onSave }) {
  const reduced = useReducedMotion()
  const [draft, setDraft] = useState(() => ({ ...brief, ...(loadFromStorage(DRAFT_KEY, null) || {}) }))
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [error, setError] = useState('')

  const isDirty = JSON.stringify(draft) !== JSON.stringify(brief)

  useEffect(() => {
    saveToStorage(DRAFT_KEY, isDirty ? draft : null)
  }, [draft, isDirty])
  const isComplete = (section) => section.fields.every((key) => filled(draft[key]))
  const completeCount = BRIEF_SECTIONS.filter(isComplete).length
  const allComplete = completeCount === BRIEF_SECTIONS.length

  function goTo(target) {
    if (step === 0 && target > 0 && !filled(draft.name)) {
      setError('Add a startup name so every role can refer to your company.')
      return
    }
    setError('')
    setDirection(target > step ? 1 : -1)
    setStep(target)
  }

  function update(key, value) {
    setDraft({ ...draft, [key]: value })
    if (key === 'name' && filled(value)) setError('')
  }

  const slide = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: (dir) => ({ opacity: 0, x: 28 * dir, filter: 'blur(4px)' }),
        animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
        exit: (dir) => ({ opacity: 0, x: -20 * dir, filter: 'blur(4px)' }),
      }

  return (
    <div className="brief">
      <nav className="brief-rail" aria-label="Brief sections">
        <div className="rail-steps">
        <div className="brief-progress" aria-hidden="true">
          <motion.span
            className="brief-progress-fill"
            animate={{ scaleY: completeCount / BRIEF_SECTIONS.length }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <ol>
          {BRIEF_SECTIONS.map((section, i) => (
            <li key={section.id}>
              <button
                type="button"
                className={`rail-step ${step === i ? 'is-current' : ''} ${isComplete(section) ? 'is-complete' : ''}`}
                onClick={() => goTo(i)}
                aria-current={step === i ? 'step' : undefined}
              >
                <span className="rail-num">0{i + 1}</span>
                <span className="rail-title">{section.title}</span>
                <span className="rail-check" aria-label={isComplete(section) ? 'complete' : undefined}>
                  {isComplete(section) && <Icon name="check" size={13} />}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className={`rail-step rail-final ${step === REVIEW_STEP ? 'is-current' : ''}`} onClick={() => goTo(REVIEW_STEP)}>
              <span className="rail-num">
                <Icon name="flag" size={13} />
              </span>
              <span className="rail-title">Context</span>
            </button>
          </li>
        </ol>
        </div>
        <div className="brief-tools">
          <button type="button" className="text-button" onClick={() => setDraft(SAMPLE_BRIEF)}>
            Load PhishGuard example
          </button>
          <button type="button" className="text-button" onClick={() => setDraft(EMPTY_BRIEF)}>
            Clear all fields
          </button>
          <span className={`save-state ${isDirty ? 'is-dirty' : ''}`}>{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
      </nav>

      <div className="brief-stage">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={slide}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: reduced ? 0.12 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {step < REVIEW_STEP ? (
              <SectionStep
                section={BRIEF_SECTIONS[step]}
                index={step}
                draft={draft}
                update={update}
                error={step === 0 ? error : ''}
                reduced={reduced}
              />
            ) : (
              <ReviewStep draft={draft} isDirty={isDirty} allComplete={allComplete} isComplete={isComplete} onSave={() => onSave(draft)} goTo={goTo} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="brief-nav">
          <button type="button" className="text-button" onClick={() => goTo(step - 1)} disabled={step === 0}>
            <Icon name="arrowLeft" size={16} />
            Back
          </button>
          {step < REVIEW_STEP && (
            <MagneticButton arrow onClick={() => goTo(step + 1)}>
              {step === REVIEW_STEP - 1 ? 'Review context' : `Next: ${BRIEF_SECTIONS[step + 1].title}`}
            </MagneticButton>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionStep({ section, index, draft, update, error, reduced }) {
  return (
    <fieldset className="brief-step">
      <legend className="brief-step-head">
        <span className="brief-step-num">0{index + 1}</span>
        <span className="brief-step-title">{section.title}</span>
      </legend>
      <p className="brief-step-intro">{section.intro}</p>

      <div className="brief-fields">
        {section.fields.map((key) => (
          <Field key={key} field={FIELDS[key]} value={draft[key]} onChange={(v) => update(key, v)} invalid={key === 'name' && !!error} />
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            className="field-error"
            role="alert"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: reduced ? 0 : [0, -6, 6, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </fieldset>
  )
}

function Field({ field, value, onChange, invalid }) {
  const id = `brief-${field.key}`
  const hasValue = filled(value)
  const LabelTag = field.type === 'select' ? 'span' : 'label'
  return (
    <div className={`field ${hasValue ? 'is-filled' : ''} ${invalid ? 'is-invalid' : ''} ${field.type === 'textarea' ? 'is-wide' : ''}`}>
      <LabelTag htmlFor={field.type === 'select' ? undefined : id} id={field.type === 'select' ? `${id}-label` : undefined} className="field-label">
        {field.label}
        <span className="field-check" aria-hidden="true">
          <Icon name="check" size={12} />
        </span>
      </LabelTag>
      <div className={`field-control ${field.type === 'select' ? 'is-options' : ''}`}>
        {field.type === 'textarea' && (
          <textarea id={id} rows={field.key === 'product' || field.key === 'goals' || field.key === 'constraints' ? 3 : 2} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        )}
        {field.type === 'text' && <input id={id} type="text" value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined} />}
        {field.type === 'select' && (
          <div className="stage-options" role="radiogroup" aria-labelledby={`${id}-label`}>
            {field.options.map((option) => (
              <button key={option} type="button" role="radio" aria-checked={value === option} className={`stage-option ${value === option ? 'is-on' : ''}`} onClick={() => onChange(option)}>
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewStep({ draft, isDirty, allComplete, isComplete, onSave, goTo }) {
  const ready = allComplete && !isDirty
  const missing = BRIEF_SECTIONS.filter((s) => !isComplete(s))

  return (
    <div className="brief-review">
      {ready ? (
        <div className="context-ready">
          <span className="micro">All six sections complete · saved</span>
          <h2 className="display-l">Company context ready</h2>
          <p className="brief-step-intro">This context powers all five AI roles. Every task you give the team starts from these facts.</p>
          <ContextBeam />
        </div>
      ) : (
        <div className="context-pending">
          <span className="micro">{isDirty ? 'Unsaved changes' : `${missing.length} section${missing.length === 1 ? '' : 's'} still empty`}</span>
          <h2 className="display-l">Review your company context</h2>
          <p className="brief-step-intro">
            {missing.length
              ? 'Empty sections are allowed, but roles will have to note what is missing instead of using real facts.'
              : 'Everything is filled in. Save to hand this context to all five roles.'}
          </p>
          {missing.length > 0 && (
            <div className="missing-list">
              {missing.map((s) => (
                <button key={s.id} type="button" className="missing-chip" onClick={() => goTo(BRIEF_SECTIONS.indexOf(s))}>
                  Complete {s.title}
                </button>
              ))}
            </div>
          )}
          <MagneticButton arrow onClick={onSave} disabled={!isDirty}>
            Save company context
          </MagneticButton>
        </div>
      )}

      <dl className="context-summary">
        {BRIEF_SECTIONS.map((section, i) => (
          <div key={section.id} className="context-row">
            <dt>
              <span className="rail-num">0{i + 1}</span> {section.title}
            </dt>
            <dd>
              {section.fields.map((key) => (
                <span key={key} className={filled(draft[key]) ? '' : 'is-empty'}>
                  {filled(draft[key]) ? draft[key] : `No ${FIELDS[key].label.toLowerCase()}`}
                </span>
              ))}
            </dd>
            <button type="button" className="text-button" onClick={() => goTo(i)} aria-label={`Edit ${section.title}`}>
              Edit
            </button>
          </div>
        ))}
      </dl>
    </div>
  )
}

// One brief fanning out to five roles: the lines draw in one after another.
function ContextBeam() {
  const reduced = useReducedMotion()
  return (
    <svg className="context-beam" viewBox="0 0 520 190" role="img" aria-label="The Company Brief feeds all five AI roles">
      <circle cx="40" cy="95" r="7" className="beam-source" />
      <text x="40" y="128" textAnchor="middle" className="beam-label">
        Brief
      </text>
      {AI_ROLES.map((role, i) => {
        const y = 15 + i * 40
        return (
          <g key={role.id} className={`role-${role.id}`}>
            <motion.path
              d={`M48 95 C200 95, 220 ${y}, 360 ${y}`}
              className="beam-line"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: reduced ? 0 : 0.15 + i * 0.12, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.circle
              cx="366"
              cy={y}
              r="5"
              className="beam-dot"
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.8 + i * 0.12 }}
            />
            <text x="382" y={y + 4} className="beam-label">
              {role.shortName}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
