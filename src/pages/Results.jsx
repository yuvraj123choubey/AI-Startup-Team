import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getRole } from '../data/aiRoles'
import { TOPIC_LABELS } from '../services/mockResponses'
import { safeResponse } from '../services/responseSchema'
import Icon from '../components/Icon'
import AnimatedPage from '../components/motion/AnimatedPage'
import MagneticButton from '../components/motion/MagneticButton'
import { Reveal } from '../components/motion/Reveal'
import ResultSection from '../components/ResultSection'
import WorkerResponse from '../components/WorkerResponse'
import OperationsSummary from '../components/OperationsSummary'
import ConflictView from '../components/ConflictView'
import FounderDecision from '../components/FounderDecision'

const SECTIONS = [
  { roleId: 'developer', number: '01', title: 'Development' },
  { roleId: 'security', number: '02', title: 'Security' },
  { roleId: 'finance', number: '03', title: 'Finance' },
  { roleId: 'legal', number: '04', title: 'Legal' },
  { roleId: 'operations', number: '05', title: 'Operations' },
]

export default function Results({ analysis, decision, onRecordDecision, onNavigate, running, onRunExample }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(() => new Set(['developer']))
  const [active, setActive] = useState('result-brief')

  // Guard against missing or partial data (older saved runs, or a role that failed).
  const ops = analysis ? normalizeOps(analysis.responses?.operations) : null
  const railItems = analysis
    ? [
        { id: 'result-brief', label: 'Founder brief' },
        ...(ops.conflicts.length ? [{ id: 'result-conflicts', label: 'Conflicts' }] : []),
        ...SECTIONS.map((s) => ({ id: `result-${s.roleId}`, label: `${s.number} ${s.title}` })),
        { id: 'result-decision', label: 'Your decision' },
      ]
    : []
  const railKey = railItems.map((r) => r.id).join()

  // Highlight the section currently in the middle of the screen.
  useEffect(() => {
    if (!railKey) return
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActive(entry.target.id)),
      { rootMargin: '-35% 0px -60% 0px' },
    )
    railKey.split(',').forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [railKey])

  function jump(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  function toggle(roleId) {
    const next = new Set(open)
    if (next.has(roleId)) next.delete(roleId)
    else next.add(roleId)
    setOpen(next)
  }

  function openAndJump(roleId) {
    setOpen(new Set([...open, roleId]))
    setTimeout(() => jump(`result-${roleId}`), 60)
  }

  if (!analysis) {
    return (
      <AnimatedPage className="page-results">
        <header className="page-intro">
          <span className="micro">Results</span>
          <h1 className="display-l">No founder brief yet.</h1>
          <p className="lede">A brief appears here after the AI team finishes a task. Run the example to see five roles analyze the same problem.</p>
          <div className="form-row">
            <MagneticButton arrow onClick={onRunExample} disabled={running}>
              {running ? 'Running…' : 'Run the login example'}
            </MagneticButton>
            <button type="button" className="text-button" onClick={() => onNavigate('task')}>
              Write my own task
            </button>
          </div>
        </header>
      </AnimatedPage>
    )
  }

  const responses = analysis.responses || {}
  const allOpen = open.size === SECTIONS.length
  const actionCount = Object.values(ops.priorities).flat().length
  const created = new Date(analysis.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  const failedRoles = SECTIONS.filter((s) => !responses[s.roleId] || responses[s.roleId].failed)
  const engineLabel = analysis.engine === 'openai' ? `Live AI${analysis.model ? ` (${analysis.model})` : ''}` : 'Simulated AI'

  return (
    <AnimatedPage className="page-results">
      <div className="results-layout">
        <nav className="results-rail" aria-label="Brief contents">
          <span className="micro">Contents</span>
          <ol>
            {railItems.map((item) => (
              <li key={item.id}>
                <button type="button" className={`rail-link ${active === item.id ? 'is-active' : ''}`} onClick={() => jump(item.id)}>
                  {active === item.id && <motion.span layoutId="rail-marker" className="rail-marker" />}
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="results-main">
          <header id="result-brief" className="results-hero">
            <span className="micro">
              {analysis.brief?.name || 'Unnamed startup'} · {created} · {engineLabel}
              {TOPIC_LABELS[analysis.topic] ? ` · ${TOPIC_LABELS[analysis.topic]}` : ''}
            </span>
            <h1 className="display-xl results-title">Final founder brief</h1>
            <p className="results-task">“{analysis.task}”</p>
            {failedRoles.length > 0 && (
              <p className="banner is-error" role="alert">
                <Icon name="alert" size={18} />
                <span>
                  {failedRoles.map((s) => getRole(s.roleId).shortName).join(', ')} did not respond, so {failedRoles.length === 1 ? 'that section is' : 'those sections are'} marked as
                  failed below. Nothing was filled in on {failedRoles.length === 1 ? 'its' : 'their'} behalf. Run the task again to retry.
                </span>
              </p>
            )}
            <Reveal as="p" className="results-lead" delay={0.1}>
              {ops.failed ? 'The Operations Lead did not finish, so there is no combined briefing. The individual reports below are still available, and the conflicts were found by comparing the roles’ stated positions directly.' : ops.briefing}
            </Reveal>
            <Reveal as="dl" className="figures" delay={0.2}>
              <div>
                <dt>Actions proposed</dt>
                <dd>{actionCount}</dd>
              </div>
              <div className={ops.conflicts.length ? 'is-warn' : ''}>
                <dt>Conflicts</dt>
                <dd>{ops.conflicts.length}</dd>
              </div>
              <div>
                <dt>Professional review</dt>
                <dd>{ops.priorities.review.length}</dd>
              </div>
              <div className={decision ? 'is-ok' : ''}>
                <dt>Workflow</dt>
                <dd className="figure-word">{decision ? 'Complete' : 'Awaiting you'}</dd>
              </div>
            </Reveal>
          </header>

          {ops.conflicts.length > 0 && (
            <section id="result-conflicts" className="block">
              <Reveal className="block-head">
                <span className="micro">Where the roles disagree</span>
                <h2 className="display-m">
                  {ops.conflicts.length} different priorit{ops.conflicts.length === 1 ? 'y' : 'ies'}
                </h2>
              </Reveal>
              <div className="conflict-stack">
                {ops.conflicts.map((conflict, i) => (
                  <Reveal key={conflict.key}>
                    <ConflictView conflict={conflict} index={i} total={ops.conflicts.length} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}

          <section className="block">
            <Reveal className="block-head block-head-row">
              <div>
                <span className="micro">Role reports</span>
                <h2 className="display-m">Five perspectives</h2>
              </div>
              <button type="button" className="text-button" onClick={() => setOpen(allOpen ? new Set() : new Set(SECTIONS.map((s) => s.roleId)))}>
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            </Reveal>
            <div className="result-list">
              {SECTIONS.map((s) => (
                <ResultSection
                  key={s.roleId}
                  id={`result-${s.roleId}`}
                  number={s.number}
                  title={s.title}
                  roleId={s.roleId}
                  roleName={getRole(s.roleId).name}
                  summary={responses[s.roleId]?.failed ? `Did not respond: ${responses[s.roleId].error || 'unknown error'}` : responses[s.roleId]?.summary || 'No report.'}
                  failed={!responses[s.roleId] || responses[s.roleId].failed}
                  open={open.has(s.roleId)}
                  onToggle={() => toggle(s.roleId)}
                >
                  {s.roleId === 'operations' ? (
                    <OperationsSummary response={ops} onJump={openAndJump} />
                  ) : (
                    <WorkerResponse response={safeResponse(responses[s.roleId]) || { roleId: s.roleId, failed: true }} roleId={s.roleId} />
                  )}
                </ResultSection>
              ))}
            </div>
          </section>

          <FounderDecision
            key={analysis.id}
            decision={decision}
            onRecord={onRecordDecision}
            reportCount={SECTIONS.length}
            actionCount={actionCount}
            conflictCount={ops.conflicts.length}
            reviewCount={ops.priorities.review.length}
          />
        </div>
      </div>
    </AnimatedPage>
  )
}

// Default every Operations field the page reads, so a failed or old response cannot crash the page.
function normalizeOps(ops) {
  const priorities = ops?.priorities || {}
  return {
    ...ops,
    failed: !ops || ops.failed,
    briefing: ops?.briefing || ops?.founderSummary || '',
    conflicts: Array.isArray(ops?.conflicts) ? ops.conflicts : [],
    roleSummaries: Array.isArray(ops?.roleSummaries) ? ops.roleSummaries : [],
    nextSteps: Array.isArray(ops?.nextSteps) ? ops.nextSteps : [],
    priorities: { high: priorities.high || [], medium: priorities.medium || [], low: priorities.low || [], review: priorities.review || [] },
  }
}
