import { useCallback, useEffect, useState } from 'react'
import AnimatedPage from '../components/motion/AnimatedPage'
import MagneticButton from '../components/motion/MagneticButton'
import { RevealGroup, RevealItem } from '../components/motion/Reveal'
import ProjectStatus from '../components/ProjectStatus'
import Icon from '../components/Icon'
import { getRole } from '../data/aiRoles'
import { BUILD_STATUS, isProjectActive, listProjects } from '../services/projectService'

const formatDate = (iso) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

// Every project the team has built, newest first. Refreshes while a build is running.
export default function ProjectsPage({ backend, onNavigate, onRefreshBackend }) {
  const [projects, setProjects] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setProjects(await listProjects())
      setError(null)
    } catch (err) {
      setError(err)
    }
  }, [])

  const anyActive = projects?.some(isProjectActive)

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(load, anyActive ? 2000 : 10000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load, anyActive])

  return (
    <AnimatedPage className="page-projects">
      <header className="page-intro">
        <span className="micro">Build mode</span>
        <h1 className="display-l">Projects</h1>
        <p className="lede">
          Everything the team has built. Each project is a separate React app in <code>workspace-projects/</code>, with its own activity log and final report.
        </p>
        <MagneticButton arrow onClick={() => onNavigate('task', { taskMode: 'build' })}>
          Start a new project
        </MagneticButton>
      </header>

      {error && (
        <p className="banner is-error" role="alert">
          <Icon name="alert" size={18} />
          <span>
            {error.message}{' '}
            <button
              type="button"
              className="text-button inline"
              onClick={() => {
                onRefreshBackend()
                load()
              }}
            >
              Try again
            </button>
          </span>
        </p>
      )}

      {!error && projects === null && <p className="muted">Loading projects…</p>}

      {projects?.length === 0 && (
        <div className="empty-state">
          <h2 className="display-m">No projects yet.</h2>
          <p className="block-lede">
            Switch the New Task page to <strong>Build Project</strong>, name the project, and describe it. The team creates the workspace, writes the code, builds it, and
            reviews it.
          </p>
          {backend.status === 'offline' && <p className="note">The backend is offline. Start it with npm run server first.</p>}
        </div>
      )}

      {projects?.length > 0 && (
        <RevealGroup as="ol" className="project-list">
          {projects.map((p) => (
            <RevealItem as="li" key={p.id} className="project-row">
              <button type="button" className="project-button" onClick={() => onNavigate('project', { projectId: p.id })}>
                <span className="project-main">
                  <span className="project-name">{p.name}</span>
                  <span className="project-task">{p.task}</span>
                  <span className="project-meta">
                    <span>{formatDate(p.createdAt)}</span>
                    <span>{p.engine === 'openai' ? 'Live AI' : 'Simulated'}</span>
                    <span>{p.framework}</span>
                    <span className="mono">{p.id}</span>
                  </span>
                </span>
                <span className="project-side">
                  <ProjectStatus status={p.status} />
                  <span className="project-facts">
                    <span>
                      <span className="micro">Agent</span>
                      {p.currentAgent ? getRole(p.currentAgent)?.shortName : isProjectActive(p) ? 'Starting…' : '—'}
                    </span>
                    <span>
                      <span className="micro">Build</span>
                      <span className={`build-${p.buildStatus}`}>{BUILD_STATUS[p.buildStatus] || p.buildStatus}</span>
                    </span>
                  </span>
                </span>
                <Icon name="arrowRight" size={18} className="project-go" />
              </button>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </AnimatedPage>
  )
}
