import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import AnimatedPage from '../components/motion/AnimatedPage'
import MagneticButton from '../components/motion/MagneticButton'
import TaskInput from '../components/TaskInput'
import WorkflowGraph from '../components/WorkflowGraph'
import RunLog from '../components/RunLog'
import EngineSwitch from '../components/EngineSwitch'
import Icon from '../components/Icon'

const MODES = [
  { id: 'analyze', label: 'Analyze', hint: 'Five role reports and a founder brief' },
  { id: 'build', label: 'Build Project', hint: 'A real React project in workspace-projects/' },
]

const BUILD_STEPS = [
  ['Operations', 'Creates a separate workspace: workspace-projects/<project-id>/'],
  ['Developer', 'Writes the React + Vite code, then runs npm install and npm run build'],
  ['Security', 'Reviews the actual code. The Developer fixes findings, rebuilds, and Security re-checks, at most 3 rounds'],
  ['Finance · Legal', 'Estimate running costs and list privacy questions. They never edit code'],
  ['Operations', 'Reports PROJECT COMPLETE or FOUNDER REVIEW REQUIRED'],
]

export default function NewTaskPage({
  brief,
  running,
  runState,
  analysis,
  decision,
  error,
  getStatus,
  onRun,
  onNavigate,
  taskMode,
  onChooseTaskMode,
  buildState,
  onStartProject,
  ai,
}) {
  const reduced = useReducedMotion()
  const [quiet, setQuiet] = useState(false)
  const runRef = useRef(null)
  const build = taskMode === 'build'
  const finished = !running && runState.done.length + runState.failed.length === 5

  function handleRun(input) {
    if (build) {
      onStartProject(input)
      return
    }
    onRun(input)
    // Bring the workflow into view so the founder watches the team work.
    requestAnimationFrame(() => runRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }))
  }

  function switchToSimulatedAndRetry() {
    ai.onChooseEngine('mock')
    if (error?.task) onRun(error.task, 'mock')
  }

  const heading = running ? 'The team is working.' : finished ? 'Final brief ready.' : 'The route your task will take.'
  const text = running
    ? 'Each role reads the Company Brief and the relevant work of the roles before it. Watch the active stage.'
    : finished
      ? 'All five roles have reported. Nothing has been acted on. The brief now waits for your review.'
      : 'Developer first, then Security and Finance review the plan, Legal checks the risks, and Operations combines it all for you.'

  const buildBlocked = build && ai.backend.status === 'offline'
  const showError = !build && error && !running
  const canSwitch = error?.engine === 'openai' && error.code !== 'partial'

  return (
    <AnimatedPage className={`page-task ${quiet ? 'is-quiet' : ''}`}>
      <header className="page-intro quiet-target">
        <span className="micro">New task</span>
        <h1 className="display-l">{build ? 'Start a project.' : 'Start a workflow.'}</h1>
        <p className="lede">
          {build
            ? 'Give the team something to build. It creates a new, separate project and reports back when it is complete or needs your review.'
            : 'Describe one specific piece of work. Specific tasks get specific answers.'}
        </p>
      </header>

      <div className="task-controls quiet-target">
        <div className="task-mode">
          <span className="micro" id="mode-label">
            Mode
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="mode-label">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={taskMode === m.id}
                className={`segment ${taskMode === m.id ? 'is-on' : ''}`}
                onClick={() => onChooseTaskMode(m.id)}
                disabled={running || buildState.submitting}
                title={m.hint}
              >
                <Icon name={m.id === 'build' ? 'code' : 'results'} size={15} />
                {m.label}
              </button>
            ))}
          </div>
          <p className="engine-note">{MODES.find((m) => m.id === taskMode).hint}</p>
        </div>
        <EngineSwitch engine={ai.engine} backend={ai.backend} onChoose={ai.onChooseEngine} onRefresh={ai.onRefreshBackend} disabled={running || buildState.submitting} />
      </div>

      {!brief.name && (
        <p className="banner quiet-target">
          <Icon name="alert" size={18} />
          <span>
            Your Company Brief is empty, so the roles have no facts about your startup.{' '}
            <button type="button" className="text-button inline" onClick={() => onNavigate('brief')}>
              Add a brief
            </button>
          </span>
        </p>
      )}

      {buildBlocked && (
        <p className="banner is-error quiet-target" role="alert">
          <Icon name="alert" size={18} />
          <span>
            Build Project needs the backend, because it writes files and runs builds on this computer.{' '}
            {ai.backend.code === 'static_site' ? (
              <>
                This GitHub Pages version has no backend: run the project locally with <code>npm run dev:all</code> to build projects.
              </>
            ) : (
              <>
                Start it with <code>npm run server</code>, then{' '}
                <button type="button" className="text-button inline" onClick={ai.onRefreshBackend}>
                  check again
                </button>
                .
              </>
            )}
          </span>
        </p>
      )}

      <TaskInput key={taskMode} mode={taskMode} onRun={handleRun} running={build ? buildState.submitting : running} onFocusChange={setQuiet} />

      {build && buildState.error && (
        <div className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          <span>
            The project could not start: {buildState.error.message}
            {buildState.error.engine === 'openai' && (
              <>
                {' '}
                <button type="button" className="text-button inline" onClick={() => ai.onChooseEngine('mock')}>
                  Switch to Simulated mode
                </button>
              </>
            )}
          </span>
        </div>
      )}

      {build ? (
        <section className="run quiet-target" aria-label="Build workflow">
          <div className="run-graph">
            <WorkflowGraph
              getStatus={() => 'ready'}
              running={false}
              finished={false}
              startLabel="Founder task"
              startSub="Project name + task"
              endLabel="Finished project"
              endSub="Founder reviews and approves"
            />
          </div>
          <div className="run-side">
            <div className="run-state">
              <span className="micro">Build mode</span>
              <h2 className="display-m">How a project gets built.</h2>
              <p className="run-text">The team works on a copy in its own folder. It never edits the AI Startup Team app itself.</p>
            </div>
            <ol className="build-steps">
              {BUILD_STEPS.map(([who, what], i) => (
                <li key={i}>
                  <span className="build-step-num">0{i + 1}</span>
                  <span>
                    <strong>{who}</strong>
                    {what}
                  </span>
                </li>
              ))}
            </ol>
            <p className="note">
              Only allowlisted commands run (npm install, npm run build, and a local preview). Deploying, buying services, using production credentials, and handling
              real customer data are never done automatically: they wait for your approval.
            </p>
            <button type="button" className="text-button" onClick={() => onNavigate('projects')}>
              View all projects <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className="run quiet-target" ref={runRef} aria-label="Workflow">
          <div className="run-graph">
            <WorkflowGraph getStatus={getStatus} running={running} finished={finished} decided={!!decision} />
          </div>

          <div className="run-side">
            <div className="run-state">
              <span className="micro">{running ? 'Running' : finished ? 'Complete' : 'Workflow'}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2 key={heading} className="display-m" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                  {heading}
                </motion.h2>
              </AnimatePresence>
              <p className="run-text">{text}</p>
            </div>

            <RunLog log={runState.log} running={running} />

            {showError && (
              <div className={`banner ${error.code === 'partial' ? '' : 'is-error'}`} role="alert">
                <Icon name="alert" size={18} />
                <span>
                  {error.message}
                  {canSwitch && (
                    <>
                      {' '}
                      No simulated answers were substituted.{' '}
                      <button type="button" className="text-button inline" onClick={switchToSimulatedAndRetry}>
                        Switch to Simulated mode and run again
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}

            <AnimatePresence>
              {finished && analysis && (
                <motion.div className="run-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <p>
                    {5 - (analysis.failedRoles?.length ?? 0)} reports on <strong>“{analysis.task}”</strong> are waiting for you.
                  </p>
                  <MagneticButton arrow onClick={() => onNavigate('results')}>
                    Read the founder brief
                  </MagneticButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}
    </AnimatedPage>
  )
}
