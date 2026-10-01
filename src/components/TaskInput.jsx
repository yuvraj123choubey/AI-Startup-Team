import { useState } from 'react'
import { BUILD_EXAMPLES, EXAMPLE_TASKS } from '../data/sampleBrief'
import MagneticButton from './motion/MagneticButton'

const MIN_BUILD_TASK = 10

// The large command input on the New Task page.
// mode "analyze": one task → five role reports.  mode "build": project name + task → a real project.
// While it has focus, the page around it goes quiet (see NewTaskPage) and the Run button becomes active.
export default function TaskInput({ mode = 'analyze', onRun, running, onFocusChange }) {
  const build = mode === 'build'
  const [task, setTask] = useState(EXAMPLE_TASKS[0])
  const [buildTask, setBuildTask] = useState(BUILD_EXAMPLES[0].task)
  const [name, setName] = useState(BUILD_EXAMPLES[0].name)
  const [focused, setFocused] = useState(false)
  const [problem, setProblem] = useState('')

  const value = build ? buildTask : task
  const setValue = build ? setBuildTask : setTask
  const trimmed = value.trim()

  function setFocus(next) {
    setFocused(next)
    onFocusChange?.(next)
  }

  function validate() {
    if (!trimmed) return build ? 'Describe what the team should build.' : 'Describe the task first.'
    if (build && !name.trim()) return 'Give the project a name.'
    if (build && trimmed.length < MIN_BUILD_TASK) return `Describe the project in at least ${MIN_BUILD_TASK} characters.`
    return ''
  }

  function submit() {
    if (running) return
    const issue = validate()
    setProblem(issue)
    if (issue) return
    setFocus(false)
    onRun(build ? { name: name.trim(), task: trimmed } : trimmed)
  }

  const examples = build ? BUILD_EXAMPLES : EXAMPLE_TASKS.map((t) => ({ task: t }))

  return (
    <form
      className={`command ${focused ? 'is-focused' : ''} ${running ? 'is-running' : ''} ${build ? 'is-build' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false)
      }}
      noValidate
    >
      <label htmlFor="task-text" className="command-label">
        {build ? 'What should your AI team build?' : 'What should your AI team work on?'}
      </label>

      {build && (
        <div className="command-name">
          <label htmlFor="project-name" className="micro">
            Project name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value)
              setProblem('')
            }}
            placeholder="e.g. Secure Login Demo"
            disabled={running}
            autoComplete="off"
          />
        </div>
      )}

      <div className="command-field">
        <span className="command-caret" aria-hidden="true" />
        <textarea
          id="task-text"
          rows={3}
          value={value}
          maxLength={build ? 2000 : 4000}
          onChange={(e) => {
            setValue(e.target.value)
            setProblem('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={
            build
              ? 'Describe the project, e.g. Create a React website with registration, login, logout and a protected dashboard.'
              : 'Describe one specific task, e.g. Add a user registration and login system to my startup website.'
          }
          disabled={running}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? 'task-problem' : undefined}
        />
      </div>

      {problem && (
        <p id="task-problem" className="command-problem" role="alert">
          {problem}
        </p>
      )}

      <div className="command-bar">
        <div className="command-suggest">
          <span className="micro">Try</span>
          {examples.map((example) => (
            <button
              key={example.task}
              type="button"
              className={`suggest ${value === example.task ? 'is-current' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue(example.task)
                if (example.name) setName(example.name)
                setProblem('')
              }}
              disabled={running}
            >
              {example.name ? <strong>{example.name}</strong> : null}
              {example.name ? ' · ' : ''}
              {example.task}
            </button>
          ))}
        </div>
        <div className="command-actions">
          <span className="hint kbd-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
          </span>
          <MagneticButton type="submit" arrow className={`run-button ${focused ? 'is-armed' : ''}`} disabled={running}>
            {build ? (running ? 'Starting project…' : 'Start project') : running ? 'Team is working' : 'Run AI team'}
          </MagneticButton>
        </div>
      </div>
    </form>
  )
}
