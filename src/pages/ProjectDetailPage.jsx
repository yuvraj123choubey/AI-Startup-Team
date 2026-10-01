import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import AnimatedPage from '../components/motion/AnimatedPage'
import MagneticButton from '../components/motion/MagneticButton'
import WorkflowGraph from '../components/WorkflowGraph'
import ProjectStatus from '../components/ProjectStatus'
import ProjectActivity from '../components/ProjectActivity'
import ProjectFiles from '../components/ProjectFiles'
import SafetyNotice from '../components/SafetyNotice'
import Icon from '../components/Icon'
import { AI_ROLES, getRole } from '../data/aiRoles'
import { BUILD_STATUS, decideApproval, deleteProject, getProject, isProjectActive, retryProject, runProject, stopProject } from '../services/projectService'

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const money = (n) => '$' + Math.round(n).toLocaleString('en-US')

// Project stage status → worker status used by the workflow graph.
function workerStatus(stage, active) {
  switch (stage?.status) {
    case 'active':
      return 'working'
    case 'waiting':
      return 'waiting'
    case 'done':
      return 'done'
    case 'warning':
      return 'warning'
    case 'failed':
      return 'failed'
    default:
      return active ? 'waiting' : 'ready'
  }
}

const STAGE_ICON = { done: 'check', warning: 'alert', failed: 'alert' }

export default function ProjectDetailPage({ projectId, onNavigate }) {
  const reduced = useReducedMotion()
  const [project, setProject] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [action, setAction] = useState({ busy: '', error: '' })
  const [showFiles, setShowFiles] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')
  const filesRef = useRef(null)
  const reportRef = useRef(null)

  const load = useCallback(async () => {
    try {
      setProject(await getProject(projectId))
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
    }
  }, [projectId])

  const active = isProjectActive(project)
  const loaded = Boolean(project)

  // Poll quickly while the team is working, slowly afterwards (preview state can change).
  useEffect(() => {
    if (!projectId) return
    const first = setTimeout(load, 0)
    const timer = setInterval(load, active || !loaded ? 1200 : 8000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [projectId, load, active, loaded])

  async function perform(name, fn) {
    setAction({ busy: name, error: '' })
    try {
      const result = await fn()
      if (result?.id) setProject(result)
      else if (name !== 'delete') await load()
      setAction({ busy: '', error: '' })
      return true
    } catch (err) {
      setAction({ busy: '', error: err.message })
      return false
    }
  }

  const scrollTo = (ref) => requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }))

  if (!projectId) {
    return (
      <AnimatedPage className="page-project">
        <header className="page-intro">
          <h1 className="display-l">No project selected.</h1>
          <button type="button" className="text-button" onClick={() => onNavigate('projects')}>
            <Icon name="arrowLeft" size={16} /> All projects
          </button>
        </header>
      </AnimatedPage>
    )
  }

  if (!project) {
    return (
      <AnimatedPage className="page-project">
        <header className="page-intro">
          <span className="micro">Project</span>
          {loadError ? (
            <>
              <h1 className="display-l">Project unavailable.</h1>
              <p className="banner is-error" role="alert">
                <Icon name="alert" size={18} />
                {loadError.message}
              </p>
            </>
          ) : (
            <h1 className="display-l">Loading…</h1>
          )}
          <button type="button" className="text-button" onClick={() => onNavigate('projects')}>
            <Icon name="arrowLeft" size={16} /> All projects
          </button>
        </header>
      </AnimatedPage>
    )
  }

  const finished = ['complete', 'review-required'].includes(project.status)
  const issues = project.security.findings.filter((f) => f.severity !== 'info')
  const fixed = issues.filter((f) => f.status === 'fixed').length
  const openIssues = issues.filter((f) => f.status === 'open').length
  const notes = project.security.findings.filter((f) => f.severity === 'info')
  const reviewQuestions = project.legal?.questions.filter((q) => q.professionalReview).length ?? 0
  const pathForUrl = project.absolutePath.replace(/\\/g, '/')

  const endStatus = { complete: 'ready', 'review-required': 'warning', failed: 'failed' }[project.status]
  const endSub = { complete: 'Project complete', 'review-required': 'Founder review required', failed: 'Stopped' }[project.status] || 'Waiting for the team'
  const getNote = (roleId) => {
    const stage = project.stages[roleId]
    if (stage?.status === 'active' && /fix/i.test(stage.note)) return 'Fixing…'
    if (stage?.status === 'waiting') return 'Waiting for fixes'
    return undefined
  }

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(project.absolutePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <AnimatedPage className="page-project">
      <header className="project-head">
        <button type="button" className="text-button" onClick={() => onNavigate('projects')}>
          <Icon name="arrowLeft" size={16} /> All projects
        </button>
        <span className="micro">
          Project · {project.id} · {project.engine === 'openai' ? `Live AI${project.model ? ` (${project.model})` : ''}` : 'Simulated'} · {project.framework}
        </span>
        <div className="project-title-row">
          <h1 className="display-l">{project.name}</h1>
          <ProjectStatus status={project.status} large />
        </div>
        <p className="results-task">“{project.task}”</p>
        <dl className="project-facts-row">
          <div>
            <dt>Created</dt>
            <dd>{formatDate(project.createdAt)}</dd>
          </div>
          <div>
            <dt>Current agent</dt>
            <dd>{project.currentAgent ? getRole(project.currentAgent)?.name : active ? 'Starting…' : 'None'}</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd className={`build-${project.buildStatus}`}>{BUILD_STATUS[project.buildStatus] || project.buildStatus}</dd>
          </div>
          <div>
            <dt>Workspace</dt>
            <dd className="mono">{project.workspace}/</dd>
          </div>
        </dl>
      </header>

      {project.status === 'failed' && (
        <div className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          <span>
            The team stopped: {project.error?.message || 'unknown error'}{' '}
            <button type="button" className="text-button inline" disabled={!!action.busy} onClick={() => perform('retry', () => retryProject(project.id, project.engine))}>
              Retry build
            </button>
            {project.engine === 'openai' && (
              <>
                {' · '}
                <button type="button" className="text-button inline" disabled={!!action.busy} onClick={() => perform('retry', () => retryProject(project.id, 'mock'))}>
                  Retry in Simulated mode
                </button>
              </>
            )}
          </span>
        </div>
      )}

      {action.error && (
        <p className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          {action.error}
        </p>
      )}

      {/* ---------- Current workspace ---------- */}
      <section className="block" aria-label="Current workspace">
        <div className="block-head">
          <span className="micro">Current workspace</span>
          <h2 className="display-m">{active ? 'The team is working on it.' : finished ? 'The team has finished.' : 'The team stopped.'}</h2>
        </div>
        <div className="run project-run">
          <div className="run-graph">
            <WorkflowGraph
              getStatus={(roleId) => workerStatus(project.stages[roleId], active)}
              getNote={getNote}
              running={active}
              finished={!active}
              startLabel="Founder task"
              startSub="Submitted"
              endLabel="Finished project"
              endSub={endSub}
              endStatus={endStatus}
            />
          </div>
          <div className="run-side">
            <ol className="stage-list">
              {AI_ROLES.map((role) => {
                const stage = project.stages[role.id] || { status: 'pending', note: 'Waiting' }
                return (
                  <li key={role.id} className={`stage-item role-${role.id} is-${stage.status}`}>
                    <span className="stage-mark" aria-hidden="true">
                      {STAGE_ICON[stage.status] ? <Icon name={STAGE_ICON[stage.status]} size={13} /> : stage.status === 'active' ? <span className="wf-spinner" /> : <span className="wf-dot" />}
                    </span>
                    <span className="stage-name">{role.shortName}</span>
                    <span className="stage-note">{stage.note}</span>
                  </li>
                )
              })}
            </ol>
            <ProjectActivity activity={project.activity} live={active} />
          </div>
        </div>
      </section>

      {/* ---------- Final report ---------- */}
      {finished && project.operations && (
        <section className={`project-report is-${project.status}`} ref={reportRef} id="project-report" aria-label="Final project report">
          <div className="report-head">
            <span className="micro">Final project report · Operations</span>
            <h2 className="display-l">{project.status === 'complete' ? 'Project complete' : 'Founder review required'}</h2>
            <p className="results-lead">{project.operations.summary}</p>
            {project.operations.reasons?.length > 0 && (
              <ul className="report-reasons">
                {project.operations.reasons.map((r) => (
                  <li key={r}>
                    <Icon name="alert" size={15} /> {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="figures report-figures">
            <div className={project.buildStatus === 'passed' ? 'is-ok' : 'is-warn'}>
              <dt>Build</dt>
              <dd className="figure-word">{project.buildStatus === 'passed' ? 'Passed' : 'Failed'}</dd>
            </div>
            <div className={openIssues ? 'is-warn' : 'is-ok'}>
              <dt>Security</dt>
              <dd className="figure-word">
                {issues.length} found · {fixed} fixed
                {openIssues ? ` · ${openIssues} open` : ''}
              </dd>
            </div>
            <div>
              <dt>Finance</dt>
              <dd className="figure-word">
                {project.finance?.costs.length ?? 0} cost consideration{project.finance?.costs.length === 1 ? '' : 's'}
              </dd>
            </div>
            <div>
              <dt>Legal</dt>
              <dd className="figure-word">
                {project.legal?.questions.length ?? 0} question{project.legal?.questions.length === 1 ? '' : 's'} · {reviewQuestions} for review
              </dd>
            </div>
          </dl>

          <div className="report-actions">
            <a className="btn btn-ghost" href={`vscode://file/${pathForUrl}`} title="Opens the folder in VS Code (if installed)">
              <Icon name="file" size={16} /> Open project
            </a>
            {project.preview ? (
              <>
                <a className="btn btn-primary" href={project.preview.url} target="_blank" rel="noopener noreferrer">
                  <Icon name="play" size={16} /> Open {project.preview.url}
                </a>
                <button type="button" className="btn btn-ghost" disabled={!!action.busy} onClick={() => perform('stop', () => stopProject(project.id))}>
                  Stop
                </button>
              </>
            ) : (
              <MagneticButton onClick={() => perform('run', () => runProject(project.id))} disabled={!!action.busy || project.buildStatus !== 'passed'}>
                <Icon name="play" size={16} /> {action.busy === 'run' ? 'Starting…' : 'Run project'}
              </MagneticButton>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowFiles(true)
                scrollTo(filesRef)
              }}
            >
              <Icon name="grid" size={16} /> View files
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => scrollTo(reportRef)}>
              <Icon name="results" size={16} /> View final report
            </button>
          </div>
          <p className="path-line">
            <span className="mono">{project.absolutePath}</span>
            <button type="button" className="text-button" onClick={copyPath}>
              {copied ? 'Copied' : 'Copy path'}
            </button>
          </p>
          {project.preview && <p className="note">Running locally at {project.preview.url} (this computer only). The preview serves the production build from dist/.</p>}

          {project.operations.nextSteps?.length > 0 && (
            <div className="report-block">
              <h3 className="micro">Recommended next steps</h3>
              <ol className="plain-list">
                {project.operations.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* ---------- Role reports ---------- */}
      {(project.developer || issues.length > 0 || notes.length > 0 || project.finance || project.legal) && (
        <section className="block" aria-label="Role reports">
          <div className="block-head">
            <span className="micro">Role reports</span>
            <h2 className="display-m">What each role did</h2>
          </div>

          {project.developer && (
            <article className="report-card role-developer">
              <h3 className="report-card-title">
                <span className="micro">01 Developer</span> Implementation
              </h3>
              <p>{project.developer.summary}</p>
              {project.developer.plan?.length > 0 && (
                <ul className="plain-list">
                  {project.developer.plan.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {project.developer.fixesApplied?.length > 0 && (
                <>
                  <h4 className="micro">Fixes applied after the security review</h4>
                  <ul className="plain-list">
                    {project.developer.fixesApplied.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
              <p className="muted small">{project.files.length} files written by the Developer.</p>
            </article>
          )}

          {(issues.length > 0 || notes.length > 0 || project.stages.security?.status === 'done') && (
            <article className="report-card role-security">
              <h3 className="report-card-title">
                <span className="micro">02 Security</span> Code review
              </h3>
              <p>
                {issues.length
                  ? `${issues.length} issue${issues.length === 1 ? '' : 's'} found, ${fixed} fixed in ${project.security.iterations} repair round${project.security.iterations === 1 ? '' : 's'} (maximum ${project.security.maxIterations}).`
                  : 'No code issues found.'}{' '}
                {project.security.summary}
              </p>
              {project.security.findings.length > 0 && (
                <div className="table-wrap">
                  <table className="estimate-table findings-table">
                    <thead>
                      <tr>
                        <th scope="col">Severity</th>
                        <th scope="col">File</th>
                        <th scope="col">Issue</th>
                        <th scope="col">Recommendation</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.security.findings.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <span className={`severity severity-${f.severity === 'info' ? 'low' : f.severity}`}>{f.severity.toUpperCase()}</span>
                          </td>
                          <td className="mono small">
                            {f.file}
                            {f.line ? `:${f.line}` : ''}
                          </td>
                          <td>{f.issue}</td>
                          <td>{f.recommendation}</td>
                          <td>
                            <span className={`finding-status is-${f.status}`}>{{ fixed: 'Fixed', open: 'Open', noted: 'Noted' }[f.status] || f.status}</span>
                            <span className="muted small"> {f.source === 'automated' ? 'automated check' : 'AI review'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="muted small">Automated checks are simple pattern rules, not a full audit. High-impact security decisions need a qualified reviewer.</p>
            </article>
          )}

          {project.finance && (
            <article className="report-card role-finance">
              <h3 className="report-card-title">
                <span className="micro">03 Finance</span> Running costs
              </h3>
              <SafetyNotice text="Financial outputs are research and planning support, not professional financial advice. All figures are estimates." />
              <p>{project.finance.summary}</p>
              <div className="table-wrap">
                <table className="estimate-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Estimate</th>
                      <th scope="col">Per</th>
                      <th scope="col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.finance.costs.map((c) => (
                      <tr key={c.item}>
                        <td>{c.item}</td>
                        <td className="num">
                          {money(c.low)}–{money(c.high)}
                        </td>
                        <td>{c.period}</td>
                        <td className="muted">{c.note}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Monthly total (estimate)</th>
                      <td className="num">
                        {money(project.finance.monthlyLow)}–{money(project.finance.monthlyHigh)}
                      </td>
                      <td>month</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </article>
          )}

          {project.legal && (
            <article className="report-card role-legal">
              <h3 className="report-card-title">
                <span className="micro">04 Legal</span> Privacy & compliance questions
              </h3>
              <SafetyNotice text="Legal outputs are research support and should not be treated as professional legal advice." />
              <p>{project.legal.summary}</p>
              <ul className="question-list">
                {project.legal.questions.map((q) => (
                  <li key={q.question}>
                    <span className="question-topic">{q.topic}</span>
                    <span>{q.question}</span>
                    {q.professionalReview && <span className="priority-tag priority-review">Professional review</span>}
                  </li>
                ))}
              </ul>
            </article>
          )}
        </section>
      )}

      {/* ---------- Founder approvals ---------- */}
      {project.approvals?.length > 0 && (
        <section className="block approvals" aria-label="Founder approvals">
          <div className="block-head">
            <span className="micro">Human approval</span>
            <h2 className="display-m">Actions that need your approval</h2>
            <p className="block-lede">
              The team recommends these but will never do them itself. Recording a decision here only keeps a record; nothing is deployed, bought, or connected.
            </p>
          </div>
          <ul className="approval-list">
            {project.approvals.map((a) => (
              <li key={a.id} className={`approval is-${a.status}`}>
                <div>
                  <strong>{a.action}</strong>
                  <span className="muted small">{a.reason}</span>
                  {a.decidedAt && (
                    <span className="small approval-state">
                      {a.status === 'approved' ? 'Approved' : 'Declined'} by the founder · {formatDate(a.decidedAt)}
                    </span>
                  )}
                </div>
                <div className="approval-actions">
                  {a.status === 'pending' ? (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={!!action.busy} onClick={() => perform('approval', () => decideApproval(project.id, a.id, 'approved'))}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={!!action.busy} onClick={() => perform('approval', () => decideApproval(project.id, a.id, 'declined'))}>
                        Decline
                      </button>
                    </>
                  ) : (
                    <button type="button" className="text-button" disabled={!!action.busy} onClick={() => perform('approval', () => decideApproval(project.id, a.id, 'pending'))}>
                      Undo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Files ---------- */}
      <section className="block" ref={filesRef} aria-label="Project files">
        <div className="block-head block-head-row">
          <div>
            <span className="micro">Workspace files</span>
            <h2 className="display-m">View files</h2>
          </div>
          <button type="button" className="text-button" onClick={() => setShowFiles(!showFiles)} aria-expanded={showFiles}>
            {showFiles ? 'Hide files' : 'Show files'}
          </button>
        </div>
        {showFiles && <ProjectFiles projectId={project.id} version={`${project.files.length}-${project.status}-${project.builds?.length ?? 0}`} />}
      </section>

      {/* ---------- Delete (founder action with confirmation) ---------- */}
      <section className="danger-zone" aria-label="Delete project">
        <div>
          <span className="micro">Delete project</span>
          <p className="small muted">
            Removes <span className="mono">{project.workspace}/</span> from this computer. This cannot be undone. Type <strong className="mono">{project.id}</strong> to confirm.
          </p>
        </div>
        <form
          className="danger-form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (confirmDelete !== project.id) return
            if (await perform('delete', () => deleteProject(project.id).then(() => null))) onNavigate('projects')
          }}
        >
          <input type="text" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={project.id} aria-label="Type the project id to confirm" disabled={active} />
          <button type="submit" className="btn btn-ghost btn-danger btn-sm" disabled={confirmDelete !== project.id || active || !!action.busy}>
            Delete project
          </button>
        </form>
      </section>
    </AnimatedPage>
  )
}
