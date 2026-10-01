import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'motion/react'
import Navbar from './components/Navbar'
import InteractiveBackground from './components/InteractiveBackground'
import Dashboard from './pages/Dashboard'
import BriefPage from './pages/BriefPage'
import TeamPage from './pages/TeamPage'
import NewTaskPage from './pages/NewTaskPage'
import Results from './pages/Results'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TroubleshootingPage from './pages/TroubleshootingPage'
import AboutPage from './pages/AboutPage'
import { SAMPLE_BRIEF, EXAMPLE_TASKS } from './data/sampleBrief'
import { getRole } from './data/aiRoles'
import { runAiTeam } from './services/aiService'
import { getHealth, setAccessCode } from './services/apiClient'
import { createProject } from './services/projectService'
import { loadFromStorage, saveToStorage } from './utils/storage'

const STORAGE_KEYS = {
  brief: 'ai-startup-team.brief',
  analysis: 'ai-startup-team.analysis',
  decision: 'ai-startup-team.decision',
  engine: 'ai-startup-team.engine',
  taskMode: 'ai-startup-team.taskMode',
}

const IDLE_RUN = { running: false, current: null, done: [], failed: [], log: [], task: '' }

// One short line for the run log when a role finishes.
function describeResult(roleId, r) {
  switch (roleId) {
    case 'developer':
      return `drafted a ${r.sections?.length ?? 0}-part plan`
    case 'security': {
      const findings = r.sections?.[0]?.items.length ?? 0
      return `flagged ${findings} issue${findings === 1 ? '' : 's'} in the plan`
    }
    case 'finance':
      return r.estimates ? `estimated $${r.estimates.monthlyLow}–$${r.estimates.monthlyHigh} per month` : 'estimated costs'
    case 'legal':
      return `raised ${r.recommendations?.filter((x) => x.priority === 'review').length ?? 0} items for professional review`
    case 'operations':
      return `merged ${Object.values(r.priorities ?? {}).flat().length} actions, found ${r.conflicts?.length ?? 0} conflicts`
    default:
      return 'finished'
  }
}

const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [teamFocus, setTeamFocus] = useState(null)
  const [projectId, setProjectId] = useState(null)
  const [brief, setBrief] = useState(() => loadFromStorage(STORAGE_KEYS.brief, SAMPLE_BRIEF))
  const [analysis, setAnalysis] = useState(() => loadFromStorage(STORAGE_KEYS.analysis, null))
  const [savedDecision, setSavedDecision] = useState(() => loadFromStorage(STORAGE_KEYS.decision, null))
  const [runState, setRunState] = useState(IDLE_RUN)
  const [error, setError] = useState(null)
  const [hasNewResults, setHasNewResults] = useState(false)
  const [backend, setBackend] = useState({ status: 'checking' })
  const [enginePref, setEnginePref] = useState(() => loadFromStorage(STORAGE_KEYS.engine, null))
  const [taskMode, setTaskMode] = useState(() => loadFromStorage(STORAGE_KEYS.taskMode, 'analyze'))
  const [buildState, setBuildState] = useState({ submitting: false, error: null })

  // Backend reachable and, if it is protected, unlocked with the founder access code.
  const backendReady = backend.status === 'online' && (!backend.accessCodeRequired || backend.accessGranted)
  // The server's AI_MODE is the default engine (only if Live AI can actually be used); the founder can switch in the UI.
  const engine = enginePref || (backend.aiMode === 'openai' && backendReady && backend.openaiConfigured ? 'openai' : 'mock')
  const checking = useRef(false)

  // A decision only counts for the analysis it was made on.
  const decision = savedDecision && analysis && savedDecision.analysisId === analysis.id ? savedDecision : null

  const refreshBackend = useCallback(async () => {
    // A sleeping hosted backend can take a minute to answer: never stack health checks.
    if (checking.current) return null
    checking.current = true
    try {
      const health = await getHealth()
      setBackend({ status: 'online', ...health })
      return health
    } catch (err) {
      setBackend({ status: 'offline', message: err.message, code: err.code })
      return null
    } finally {
      checking.current = false
    }
  }, [])

  // Save the founder access code in this browser and check it against the backend.
  async function unlock(code) {
    setAccessCode(code.trim())
    const health = await refreshBackend()
    if (health && !health.accessGranted) setAccessCode('')
    return Boolean(health?.accessGranted)
  }

  function lock() {
    setAccessCode('')
    if (enginePref === 'openai') chooseEngine('mock')
    refreshBackend()
  }

  useEffect(() => {
    // Health check on load, then every 20 seconds so the UI notices when the backend starts or stops.
    const first = setTimeout(refreshBackend, 0)
    const timer = setInterval(refreshBackend, 20000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [refreshBackend])

  function navigate(pageId, options = {}) {
    setTeamFocus(options.role || null)
    if (options.projectId) setProjectId(options.projectId)
    if (options.taskMode) chooseTaskMode(options.taskMode)
    setPage(pageId)
    if (pageId === 'results') setHasNewResults(false)
  }

  function saveBrief(nextBrief) {
    setBrief(nextBrief)
    saveToStorage(STORAGE_KEYS.brief, nextBrief)
  }

  function chooseEngine(next) {
    setEnginePref(next)
    saveToStorage(STORAGE_KEYS.engine, next)
    setError(null)
    setBuildState((s) => ({ ...s, error: null }))
  }

  function chooseTaskMode(next) {
    setTaskMode(next)
    saveToStorage(STORAGE_KEYS.taskMode, next)
  }

  // Status of one worker, used by the network, system map, roster, and workflow graph.
  function getStatus(roleId) {
    if (runState.failed.includes(roleId)) return 'failed'
    if (runState.done.includes(roleId)) return 'done'
    if (runState.running) return runState.current === roleId ? 'working' : 'waiting'
    return 'ready'
  }

  async function runTask(task, engineOverride) {
    if (runState.running) return
    const useEngine = engineOverride || engine
    setError(null)
    setRunState({ ...IDLE_RUN, running: true, task })
    let entryId = 0
    const logEntry = (roleId, type, text) => ({ id: ++entryId, roleId, type, text, time: clock() })

    try {
      const result = await runAiTeam({
        brief,
        task,
        engine: useEngine,
        onStepStart: (roleId) =>
          setRunState((s) => ({
            ...s,
            current: roleId,
            log: [...s.log, logEntry(roleId, 'start', `is ${getRole(roleId).activeVerb.toLowerCase()}…`)],
          })),
        onStepDone: (roleId, response) =>
          setRunState((s) => ({
            ...s,
            done: [...s.done, roleId],
            log: [...s.log, logEntry(roleId, 'done', describeResult(roleId, response))],
          })),
        onStepFailed: (roleId, err) =>
          setRunState((s) => ({
            ...s,
            failed: [...s.failed, roleId],
            log: [...s.log, logEntry(roleId, 'error', `failed: ${err.message}`)],
          })),
      })
      setAnalysis(result)
      saveToStorage(STORAGE_KEYS.analysis, result)
      setHasNewResults(true)
      setRunState((s) => ({ ...s, running: false, current: null }))
      if (result.failedRoles.length) {
        setError({
          message: `${result.failedRoles.map((id) => getRole(id).shortName).join(', ')} did not respond. Their sections are marked as failed in the results.`,
          code: 'partial',
          engine: useEngine,
          task,
        })
      }
    } catch (err) {
      setError({ message: `The AI team stopped before finishing: ${err.message}`, code: err.code, engine: useEngine, task })
      setRunState((s) => ({ ...s, running: false, current: null }))
    }
  }

  async function startProject({ name, task }) {
    if (buildState.submitting) return
    setBuildState({ submitting: true, error: null })
    try {
      const project = await createProject({ name, task, brief, mode: engine })
      setBuildState({ submitting: false, error: null })
      navigate('project', { projectId: project.id })
    } catch (err) {
      setBuildState({ submitting: false, error: { message: err.message, code: err.code, engine } })
      if (err.code === 'server_unavailable') refreshBackend()
    }
  }

  function recordDecision(newDecision) {
    const withId = { ...newDecision, analysisId: analysis.id }
    setSavedDecision(withId)
    saveToStorage(STORAGE_KEYS.decision, withId)
  }

  function runExample() {
    chooseTaskMode('analyze')
    navigate('task')
    runTask(EXAMPLE_TASKS[0])
  }

  const aiContext = { engine, backend, backendReady, onChooseEngine: chooseEngine, onRefreshBackend: refreshBackend, onUnlock: unlock, onLock: lock }

  function renderPage() {
    switch (page) {
      case 'brief':
        return <BriefPage key="brief" brief={brief} onSave={saveBrief} />
      case 'team':
        return <TeamPage key="team" getStatus={getStatus} briefName={brief.name} focusRole={teamFocus} />
      case 'task':
        return (
          <NewTaskPage
            key="task"
            brief={brief}
            running={runState.running}
            runState={runState}
            analysis={analysis}
            decision={decision}
            error={error}
            getStatus={getStatus}
            onRun={runTask}
            onNavigate={navigate}
            taskMode={taskMode}
            onChooseTaskMode={chooseTaskMode}
            buildState={buildState}
            onStartProject={startProject}
            ai={aiContext}
          />
        )
      case 'results':
        return (
          <Results
            key="results"
            analysis={analysis}
            decision={decision}
            onRecordDecision={recordDecision}
            onNavigate={navigate}
            running={runState.running}
            onRunExample={runExample}
          />
        )
      case 'projects':
        return <ProjectsPage key="projects" backend={backend} onNavigate={navigate} onRefreshBackend={refreshBackend} />
      case 'project':
        return <ProjectDetailPage key={`project-${projectId}`} projectId={projectId} backend={backend} onNavigate={navigate} />
      case 'troubleshooting':
        return <TroubleshootingPage key="troubleshooting" />
      case 'about':
        return <AboutPage key="about" engine={engine} backend={backend} />
      default:
        return (
          <Dashboard
            key="dashboard"
            brief={brief}
            analysis={analysis}
            decision={decision}
            getStatus={getStatus}
            running={runState.running}
            onNavigate={navigate}
          />
        )
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <InteractiveBackground active={runState.running} />
      <Navbar
        page={page === 'project' ? 'projects' : page}
        onNavigate={navigate}
        briefName={brief.name}
        running={runState.running}
        hasNewResults={hasNewResults}
        engine={engine}
        backend={backend}
      />

      <main className="main">
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
          {renderPage()}
        </AnimatePresence>
      </main>

      <footer className="site-footer">
        <span>AI Startup Team · student prototype</span>
        <span>AI output is research support. The founder makes every decision.</span>
      </footer>
    </MotionConfig>
  )
}
