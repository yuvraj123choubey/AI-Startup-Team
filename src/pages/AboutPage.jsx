import AnimatedPage from '../components/motion/AnimatedPage'
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal'
import SafetyNotice from '../components/SafetyNotice'

const HOW_IT_WORKS = [
  ['Company Brief', 'The founder describes the company once. Every role receives it.'],
  ['Task', 'The founder submits one specific task.'],
  ['Specialists', 'The Developer plans it. Security reviews that plan, then Finance and Legal add costs and risks.'],
  ['Synthesis', 'The Operations Lead merges all four reports, sorts the work by priority, and flags conflicts.'],
  ['Decision', 'The founder verifies, compares, and records a decision. Nothing happens automatically.'],
  ['Build mode', 'The same team can also build a small React project in its own folder: the Developer writes and builds it, Security reviews the code and the Developer fixes what it finds (at most three rounds), then Finance, Legal, and Operations report.'],
]

const FILES = [
  ['src/data/aiRoles.js', 'Each role’s name, responsibilities, Analyze prompt, and Build prompt (shared with the backend)'],
  ['src/services/aiService.js', 'Runs the five roles in order, in Simulated or Live AI mode'],
  ['src/services/promptBuilder.js', 'Builds each role’s exact prompt and decides which earlier outputs it receives'],
  ['src/services/responseSchema.js', 'Validates structured JSON responses before they are shown'],
  ['src/services/mockResponses.js', 'Simulated answers (no API key needed)'],
  ['src/services/conflictDetector.js', 'Compares role positions to find disagreements'],
  ['server/', 'Express backend: OpenAI calls, project manager, safe file writes, allowlisted build commands'],
  ['workspace-projects/', 'Projects created in Build mode, one folder each'],
  ['src/components/', 'Reusable UI: network, system map, workflow graph, conflict view…'],
  ['src/components/motion/', 'Animation building blocks: page transitions, reveals, magnetic buttons'],
  ['src/pages/', 'One file per screen'],
]

export default function AboutPage({ engine, backend }) {
  return (
    <AnimatedPage className="page-about">
      <div className="about">
        <aside className="about-aside">
          <span className="micro">About the project</span>
          <h1 className="display-l">Why five roles instead of one assistant?</h1>
        </aside>

        <div className="about-body">
          <Reveal as="p" className="about-lead">
            A solo founder has to think like an engineer, a security reviewer, an accountant, a lawyer, and a manager. One general assistant tends to
            blur those views together. This prototype gives each view its own worker, with its own instructions, reading the same company facts. When
            they disagree, that disagreement is shown to the founder instead of being averaged away.
          </Reveal>

          <section className="about-section">
            <h2 className="micro">How it works</h2>
            <RevealGroup as="ol" className="steps-list">
              {HOW_IT_WORKS.map(([title, text], i) => (
                <RevealItem as="li" key={title}>
                  <span className="steps-num">0{i + 1}</span>
                  <span>
                    <strong>{title}</strong>
                    {text}
                  </span>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>

          <section className="about-section">
            <h2 className="micro">How the code is organized</h2>
            <dl className="file-list">
              {FILES.map(([file, text]) => (
                <div key={file}>
                  <dt>
                    <code>{file}</code>
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <p className="about-note">
              Current engine: <strong>{engine === 'openai' ? 'Live AI (OpenAI via the backend)' : 'Simulated responses'}</strong>. Backend:{' '}
              <strong>{backend?.status === 'online' ? `online, AI_MODE=${backend.aiMode}` : backend?.status === 'offline' ? 'offline' : 'checking'}</strong>.
            </p>
          </section>

          <section className="about-section">
            <h2 className="micro">Using a real AI model</h2>
            <ol className="plain-list">
              <li>
                Copy <code>.env.example</code> to <code>.env</code> and put your key in <code>OPENAI_API_KEY</code>.
              </li>
              <li>
                Set <code>AI_MODE=openai</code> (or keep <code>mock</code> and switch to Live AI on the New Task page).
              </li>
              <li>
                Start the backend with <code>npm run server</code>. It sends each role’s own prompt to OpenAI and validates the JSON reply.
              </li>
            </ol>
            <p className="about-note">The API key stays in the backend. The browser never sees it, because only variables starting with VITE_ reach frontend code.</p>
          </section>

          <section className="about-section">
            <h2 className="micro">Limits of this prototype</h2>
            <ul className="plain-list">
              <li>Simulated answers come from keyword rules, so login, payments, and data/analytics tasks get detailed answers and others get general ones.</li>
              <li>Build mode supports one template (React + Vite) and small, browser-only projects. Generated login systems store accounts in the browser, which is a demo, not production authentication.</li>
              <li>The automated security checks are simple pattern rules, not a professional audit.</li>
              <li>Cost figures are typical published ranges, not quotes.</li>
              <li>Analyses are saved only in this browser; projects are saved in workspace-projects/ on this computer.</li>
            </ul>
          </section>
        </div>
      </div>

      <SafetyNotice variant="full" />
    </AnimatedPage>
  )
}
