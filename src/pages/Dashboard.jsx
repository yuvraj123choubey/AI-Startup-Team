import AnimatedPage from '../components/motion/AnimatedPage'
import MagneticButton from '../components/motion/MagneticButton'
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal'
import AgentNetwork from '../components/AgentNetwork'
import TeamRoster from '../components/TeamRoster'
import SafetyNotice from '../components/SafetyNotice'
import Icon from '../components/Icon'

export default function Dashboard({ brief, analysis, decision, getStatus, running, onNavigate }) {
  const ops = analysis?.responses.operations
  const conflicts = ops?.conflicts.length ?? 0
  const openRole = (roleId) => onNavigate('team', { role: roleId })

  return (
    <AnimatedPage className="page-dashboard">
      <section className="hero">
        <RevealGroup className="hero-copy" stagger={0.09}>
          <RevealItem as="span" className="micro">
            Multi-agent workspace{brief.name ? ` · ${brief.name}` : ''}
          </RevealItem>
          <RevealItem as="h1" className="display-xl hero-title">
            AI Startup
            <br />
            Team
          </RevealItem>
          <RevealItem as="ul" className="hero-lines">
            <li>Five specialized AI roles.</li>
            <li>One shared company context.</li>
            <li>
              <strong>One founder making the final decision.</strong>
            </li>
          </RevealItem>
          <RevealItem className="hero-actions">
            <MagneticButton arrow onClick={() => onNavigate('task')}>
              Give the team a task
            </MagneticButton>
            <button type="button" className="text-button" onClick={() => onNavigate('brief')}>
              Configure company context
            </button>
          </RevealItem>
        </RevealGroup>

        <Reveal className="hero-visual" delay={0.15} y={10}>
          <AgentNetwork getStatus={getStatus} briefName={brief.name} running={running} onSelectRole={openRole} />
          <p className="hero-hint">Hover a role to see what it does · click to open it</p>
        </Reveal>
      </section>

      <Reveal as="section" className="strip" aria-label="Company snapshot">
        <div className="strip-item">
          <span className="micro">Company</span>
          <span className="strip-value">{brief.name || 'Not set'}</span>
        </div>
        <div className="strip-item">
          <span className="micro">Stage</span>
          <span className="strip-value">{brief.stage || '—'}</span>
        </div>
        <div className="strip-item">
          <span className="micro">Budget</span>
          <span className="strip-value num">{brief.budget || '—'}</span>
        </div>
        <div className="strip-item">
          <span className="micro">Market</span>
          <span className="strip-value">{brief.market || '—'}</span>
        </div>
        <button type="button" className="strip-item strip-latest" onClick={() => onNavigate(analysis ? 'results' : 'task')}>
          <span className="micro">Latest analysis</span>
          {running ? (
            <span className="strip-value">
              <span className="live-dot" /> The team is working…
            </span>
          ) : analysis ? (
            <>
              <span className="strip-value strip-task">“{analysis.task}”</span>
              <span className="strip-meta">
                {conflicts} conflict{conflicts === 1 ? '' : 's'} · {decision ? 'Workflow complete' : 'Awaiting founder review'}
              </span>
            </>
          ) : (
            <span className="strip-value">No tasks yet</span>
          )}
          <Icon name="arrowRight" size={16} className="strip-arrow" />
        </button>
      </Reveal>

      <section className="block">
        <Reveal className="block-head">
          <span className="micro">The team</span>
          <h2 className="display-m">Five roles, five points of view.</h2>
          <p className="block-lede">
            Each role reads the same Company Brief but owns different questions. A task travels through them in this order.
          </p>
        </Reveal>
        <TeamRoster getStatus={getStatus} onOpen={openRole} />
      </section>

      <SafetyNotice variant="full" />
    </AnimatedPage>
  )
}
