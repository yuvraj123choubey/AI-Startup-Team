// Build mode pipeline:
//
//   Founder task → Operations creates project → Developer writes code → npm install + build
//   → Security reviews the code → (Developer fixes → build → Security re-check) × up to 3
//   → Finance cost review → Legal questions → Operations status report → Founder
//
// Every step is logged to the project's activity feed. Nothing is deployed, purchased,
// or connected to external accounts: those only appear as approval requests.
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { AppError } from '../errors.js'
import { mockAgents } from './agents/mockAgents.js'
import { openaiAgents } from './agents/openaiAgents.js'
import { analyzeTask } from './mock/mockProjectGenerator.js'
import { clearGeneratedSources, projectDir, readSourceFiles, writeAiFiles, writeTemplateFiles } from './projectFiles.js'
import { runProjectCommand, stopPreview } from './projectExecutor.js'
import { getProject, isActive, logActivity, setStage, slugify, updateProject } from './projectManager.js'
import { isBlocking, isFixable, scanFiles, SEVERITY_ORDER } from './securityScanner.js'
import { reactViteTemplate } from './projectTemplates.js'

export const MAX_REPAIR_ROUNDS = 3
const MAX_BUILD_FIX_ATTEMPTS = 2
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`

let queue = Promise.resolve()

// Projects are built one at a time; later ones wait with status "queued".
export function enqueueBuild(projectId) {
  queue = queue.then(() => runPipeline(projectId)).catch((err) => console.error('[build]', err))
}

export function retryBuild(projectId, engine) {
  const project = getProject(projectId)
  if (isActive(project)) throw new AppError('busy', 'This project is already being built.', { status: 409 })
  stopPreview(projectId)
  clearGeneratedSources(projectDir(projectId))
  updateProject(projectId, (p) => {
    p.engine = engine
    p.model = engine === 'openai' ? config.openaiModel : null
    p.status = 'queued'
    p.buildStatus = 'pending'
    p.currentAgent = null
    p.completedAt = null
    p.error = null
    p.files = []
    p.builds = []
    p.developer = null
    p.security = { iterations: 0, maxIterations: MAX_REPAIR_ROUNDS, findings: [], summary: '' }
    p.finance = null
    p.legal = null
    p.operations = null
    p.approvals = []
    p.mockState = null
    p.previewEnabled = false
    p.stages = Object.fromEntries(Object.keys(p.stages).map((id) => [id, { status: 'pending', note: 'Waiting' }]))
  })
  logActivity(projectId, 'system', 'info', `Founder restarted the build (${engine === 'openai' ? 'Live AI' : 'Simulated'} mode)`)
  enqueueBuild(projectId)
  return getProject(projectId)
}

async function runPipeline(id) {
  const project = getProject(id)
  const agents = project.engine === 'openai' ? openaiAgents : mockAgents
  const mock = project.engine !== 'openai'
  const pace = (ms) => (mock ? sleep(ms) : Promise.resolve())
  const dir = projectDir(id)
  const brief = project.brief || {}
  const log = (roleId, type, text) => logActivity(id, roleId, type, text)
  let currentRole = 'developer'

  // ----- helpers -----

  async function writeFiles(files, { initial = false } = {}) {
    const { results, rejected } = writeAiFiles(dir, files)
    for (const r of results.filter((x) => x.action !== 'unchanged')) {
      log('developer', 'file', `Developer ${r.action === 'created' || initial ? 'created' : 'updated'} ${r.path}`)
      await pace(90)
    }
    for (const r of rejected) log('security', 'warn', `Blocked unsafe file from the Developer: ${r.path} (${r.reason})`)
    updateProject(id, (p) => {
      p.files = [...new Set([...p.files, ...results.map((r) => r.path)])].sort()
    })
    return results.filter((x) => x.action !== 'unchanged')
  }

  async function build(reason) {
    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
      updateProject(id, (p) => (p.buildStatus = 'installing'))
      log('system', 'start', 'Installing dependencies (npm install)')
      const install = await runProjectCommand(dir, 'install')
      if (!install.ok) {
        updateProject(id, (p) => p.builds.push({ step: 'install', ok: false, at: new Date().toISOString(), durationMs: install.durationMs, output: install.output }))
        throw new AppError('install_failed', `npm install failed${install.timedOut ? ' (timed out)' : ''}. Check the internet connection and try again. ${install.output.trim().split('\n').slice(-2).join(' ')}`)
      }
      log('system', 'done', `Dependencies installed (${(install.durationMs / 1000).toFixed(1)}s)`)
    }
    updateProject(id, (p) => (p.buildStatus = 'building'))
    log('system', 'start', `Build started (npm run build)${reason ? ' · ' + reason : ''}`)
    const result = await runProjectCommand(dir, 'build')
    updateProject(id, (p) => {
      p.buildStatus = result.ok ? 'passed' : 'failed'
      p.builds.push({ step: 'build', ok: result.ok, at: new Date().toISOString(), durationMs: result.durationMs, output: result.ok ? '' : result.output })
    })
    if (result.ok) log('system', 'done', `Build successful (${(result.durationMs / 1000).toFixed(1)}s)`)
    else log('system', 'error', `Build failed${result.timedOut ? ' (timed out)' : ''}: ${firstErrorLine(result.output)}`)
    return result
  }

  // Build, and if it fails let the Developer fix the error (bounded).
  async function buildWithFixes(reason) {
    let result = await build(reason)
    for (let attempt = 1; !result.ok && attempt <= MAX_BUILD_FIX_ATTEMPTS; attempt++) {
      currentRole = 'developer'
      setStage(id, 'developer', 'active', `Fixing the build (attempt ${attempt} of ${MAX_BUILD_FIX_ATTEMPTS})`)
      log('developer', 'start', `Developer is fixing the build error (attempt ${attempt} of ${MAX_BUILD_FIX_ATTEMPTS})`)
      const fix = await agents.developerFix({ project: getProject(id), brief, files: readSourceFiles(dir), buildError: result.output, state: getProject(id).mockState })
      if (fix.state) updateProject(id, (p) => (p.mockState = fix.state))
      const changed = await writeFiles(fix.files)
      if (!changed.length) {
        log('developer', 'warn', 'Developer could not find a change that fixes the build')
        break
      }
      result = await build('after build fix')
    }
    setStage(id, 'developer', result.ok ? 'done' : 'failed', result.ok ? 'Implementation complete' : 'Build is failing')
    return result
  }

  // One security review round. Reconciles automated + AI findings with earlier rounds.
  async function review(round) {
    const files = readSourceFiles(dir)
    const automated = scanFiles(files)
    const before = getProject(id).security.findings
    const openAi = before.filter((f) => f.source === 'ai' && f.status === 'open')
    const result = await agents.securityReview({ project: getProject(id), brief, files, automated, openFindings: openAi })
    const current = new Set(automated.map((f) => f.id))
    const resolvedAi = new Set(result.resolvedIds || [])
    let newCount = 0
    let fixedCount = 0

    updateProject(id, (p) => {
      const known = new Set(p.security.findings.map((f) => f.id))
      p.security.findings.forEach((f) => {
        if (f.status !== 'open') return
        const gone = f.source === 'automated' ? !current.has(f.id) : resolvedAi.has(f.id)
        if (gone) {
          f.status = 'fixed'
          f.fixedInRound = round
          fixedCount++
        }
      })
      automated.forEach((f) => {
        if (known.has(f.id)) return
        p.security.findings.push({ ...f, status: f.severity === 'info' ? 'noted' : 'open', foundInRound: round })
        newCount++
      })
      let n = p.security.findings.filter((f) => f.source === 'ai').length
      ;(result.findings || []).forEach((f) => {
        n++
        p.security.findings.push({ ...f, id: `ai-${n}`, source: 'ai', status: f.severity === 'info' ? 'noted' : 'open', foundInRound: round })
        newCount++
      })
      p.security.findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
      if (result.summary) p.security.summary = result.summary
    })
    return { newCount, fixedCount }
  }

  const openFindings = () => getProject(id).security.findings.filter((f) => f.status === 'open')

  try {
    updateProject(id, (p) => {
      p.status = 'building'
      p.startedAt = new Date().toISOString()
    })
    log('operations', 'info', `Operations assigned “${project.task.slice(0, 140)}${project.task.length > 140 ? '…' : ''}” to the team (${agents.label} mode)`)
    await pace(500)

    // ----- 1. Developer writes the code -----
    currentRole = 'developer'
    setStage(id, 'developer', 'active', 'Writing code…')
    log('developer', 'start', 'Developer is planning the project structure')
    writeTemplateFiles(dir, reactViteTemplate({ packageName: slugify(project.name), title: project.name }))
    log('developer', 'file', 'Developer created React + Vite project from the template')
    await pace(400)

    const dev = await agents.developerBuild({ project: getProject(id), brief })
    updateProject(id, (p) => {
      p.developer = { summary: dev.summary, plan: dev.plan, notes: dev.notes, fixesApplied: [] }
      if (dev.state) p.mockState = dev.state
    })
    dev.plan?.slice(0, 6).forEach((step) => log('developer', 'info', `Plan: ${step}`))
    const written = await writeFiles(dev.files, { initial: true })
    if (!written.length) throw new AppError('invalid_response', 'The Developer did not produce any valid files.')
    log('developer', 'done', `Developer wrote ${plural(written.length, 'file')}`)

    // ----- 2. Build -----
    const firstBuild = await buildWithFixes('first build')
    const buildOk = () => getProject(id).buildStatus === 'passed'

    // ----- 3. Security review + repair loop -----
    updateProject(id, (p) => (p.status = 'reviewing'))
    currentRole = 'security'
    if (firstBuild.ok) {
      setStage(id, 'security', 'active', 'Reviewing code…')
      log('security', 'start', `Security review started (${readSourceFiles(dir).length} files)`)
      await review(0)
      const found = getProject(id).security.findings
      const issues = found.filter((f) => f.severity !== 'info')
      const counts = ['high', 'medium', 'low'].map((s) => [s, issues.filter((f) => f.severity === s).length]).filter(([, n]) => n)
      log('security', issues.length ? 'warn' : 'done', issues.length ? `Security found ${issues.length} issue${issues.length === 1 ? '' : 's'} (${counts.map(([s, n]) => `${n} ${s}`).join(', ')})` : 'Security found no code issues')
      issues.forEach((f) => log('security', 'finding', `${f.severity.toUpperCase()} · ${f.file} — ${f.issue.split('. ')[0]}`))
      found.filter((f) => f.severity === 'info').forEach((f) => log('security', 'info', `Note · ${f.file} — ${f.issue.split('. ')[0]}`))

      for (let round = 1; round <= MAX_REPAIR_ROUNDS && openFindings().some(isFixable); round++) {
        updateProject(id, (p) => (p.security.iterations = round))
        const toFix = openFindings().filter(isFixable)
        currentRole = 'developer'
        setStage(id, 'security', 'waiting', `Waiting for fixes (round ${round} of ${MAX_REPAIR_ROUNDS})`)
        setStage(id, 'developer', 'active', `Fixing ${toFix.length} security issue${toFix.length === 1 ? '' : 's'} (round ${round})`)
        log('developer', 'start', `Developer is fixing ${toFix.length} security issue${toFix.length === 1 ? '' : 's'} (round ${round} of ${MAX_REPAIR_ROUNDS})`)
        const fix = await agents.developerFix({ project: getProject(id), brief, files: readSourceFiles(dir), findings: toFix, state: getProject(id).mockState })
        updateProject(id, (p) => {
          if (fix.state) p.mockState = fix.state
          p.developer.fixesApplied.push(...(fix.applied || []))
        })
        ;(fix.applied || []).forEach((a) => log('developer', 'info', `Fix: ${a}`))
        const changed = await writeFiles(fix.files)
        if (!changed.length) {
          log('developer', 'warn', 'Developer could not produce a fix for the remaining findings')
          setStage(id, 'developer', 'done', 'Implementation complete')
          break
        }
        log('developer', 'done', `Developer fixed issues in ${changed.length} file${changed.length === 1 ? '' : 's'}`)
        const rebuilt = await buildWithFixes(`after security fixes, round ${round}`)
        if (!rebuilt.ok) break

        currentRole = 'security'
        setStage(id, 'security', 'active', `Re-checking (round ${round})`)
        log('security', 'start', `Security re-check started (round ${round})`)
        const { newCount, fixedCount } = await review(round)
        const stillOpen = openFindings().length
        log(
          'security',
          stillOpen ? 'warn' : 'done',
          `Security confirmed ${fixedCount} fix${fixedCount === 1 ? '' : 'es'}${newCount ? `, found ${newCount} new issue${newCount === 1 ? '' : 's'}` : ''}${stillOpen ? `, ${stillOpen} still open` : ' · no open issues'}`,
        )
      }

      const open = openFindings()
      const all = getProject(id).security.findings.filter((f) => f.severity !== 'info')
      const fixed = all.filter((f) => f.status === 'fixed').length
      if (open.some(isBlocking)) log('security', 'warn', `${open.filter(isBlocking).length} high/medium issue${open.filter(isBlocking).length === 1 ? '' : 's'} still open after ${getProject(id).security.iterations} repair round${getProject(id).security.iterations === 1 ? '' : 's'}: needs founder review`)
      setStage(id, 'security', open.some(isBlocking) ? 'warning' : 'done', all.length ? `Review complete · ${all.length} found, ${fixed} fixed` : 'Review complete · no issues')
    } else {
      setStage(id, 'security', 'warning', 'Skipped: the build is failing')
      log('security', 'warn', 'Security review skipped because the project does not build')
    }

    // ----- 4. Finance (never edits code) -----
    const files = readSourceFiles(dir)
    currentRole = 'finance'
    setStage(id, 'finance', 'active', 'Estimating costs…')
    log('finance', 'start', 'Finance is estimating running costs')
    const finance = await agents.financeReview({ project: getProject(id), brief, files, developer: getProject(id).developer })
    const monthly = finance.costs.filter((c) => c.period === 'month')
    updateProject(id, (p) => {
      p.finance = { ...finance, monthlyLow: Math.round(monthly.reduce((s, c) => s + c.low, 0)), monthlyHigh: Math.round(monthly.reduce((s, c) => s + c.high, 0)) }
    })
    log('finance', 'done', `Finance listed ${plural(finance.costs.length, 'cost consideration')} (estimates)`)
    setStage(id, 'finance', 'done', `Cost review complete · ${plural(finance.costs.length, 'consideration')}`)

    // ----- 5. Legal (never edits code) -----
    currentRole = 'legal'
    setStage(id, 'legal', 'active', 'Reviewing privacy questions…')
    log('legal', 'start', 'Legal is reviewing privacy and compliance questions')
    const legal = await agents.legalReview({ project: getProject(id), brief, files, developer: getProject(id).developer })
    const reviewCount = legal.questions.filter((q) => q.professionalReview).length
    updateProject(id, (p) => (p.legal = legal))
    log('legal', 'done', `Legal raised ${plural(legal.questions.length, 'question')}, ${reviewCount} for professional review`)
    setStage(id, 'legal', 'done', `Privacy questions reviewed · ${plural(legal.questions.length, 'question')}`)

    // ----- 6. Operations: status decided by rules, described by the agent -----
    currentRole = 'operations'
    setStage(id, 'operations', 'active', 'Checking project status…')
    log('operations', 'start', 'Operations is checking project status')
    const p = getProject(id)
    const issues = p.security.findings.filter((f) => f.severity !== 'info')
    const openBlocking = p.security.findings.filter((f) => f.status === 'open' && isBlocking(f))
    const reasons = [
      ...(buildOk() ? [] : ['The production build is failing.']),
      ...(openBlocking.length ? [`${openBlocking.length} high/medium security issue${openBlocking.length === 1 ? '' : 's'} remain after ${p.security.iterations} repair round${p.security.iterations === 1 ? '' : 's'}.`] : []),
    ]
    const outcome = reasons.length ? 'review-required' : 'complete'
    const facts = {
      buildPassed: buildOk(),
      found: issues.length,
      fixed: issues.filter((f) => f.status === 'fixed').length,
      open: issues.filter((f) => f.status === 'open').length,
      notes: p.security.findings.filter((f) => f.severity === 'info').length,
      repairRounds: p.security.iterations,
      costCount: p.finance.costs.length,
      monthlyLow: p.finance.monthlyLow,
      monthlyHigh: p.finance.monthlyHigh,
      questionCount: p.legal.questions.length,
      reviewCount,
      reasons,
    }
    const ops = await agents.operationsReport({ project: p, brief, outcome, facts })
    updateProject(id, (proj) => {
      proj.operations = { outcome, reasons, summary: ops.summary, nextSteps: ops.nextSteps, facts }
      proj.approvals = approvalsFor(proj)
      proj.status = outcome
      proj.completedAt = new Date().toISOString()
      proj.currentAgent = null
    })
    setStage(id, 'operations', 'done', outcome === 'complete' ? 'Final review complete' : 'Founder review required')
    log('operations', outcome === 'complete' ? 'done' : 'warn', outcome === 'complete' ? 'Project complete' : `Founder review required: ${reasons.join(' ')}`)
  } catch (err) {
    const message = err instanceof AppError ? err.message : `Unexpected error: ${err.message}`
    if (!(err instanceof AppError)) console.error('[build]', err)
    setStage(id, currentRole, 'failed', 'Stopped by an error')
    updateProject(id, (p) => {
      p.status = 'failed'
      p.currentAgent = null
      p.completedAt = new Date().toISOString()
      p.error = { code: err.code || 'build_error', message, fatal: Boolean(err.fatal) }
    })
    log(currentRole, 'error', `Stopped: ${message}`)
  }
}

function firstErrorLine(output) {
  const lines = output.split('\n').map((l) => l.trim()).filter(Boolean)
  return (lines.find((l) => /error/i.test(l)) || lines.at(-1) || 'unknown error').slice(0, 220)
}

// Actions the AI team may recommend but never performs. The founder records a decision for each.
function approvalsFor(project) {
  const f = analyzeTask(project.name, project.task).features
  const paid = (project.finance?.costs || []).filter((c) => c.high > 0)
  const items = [
    { id: 'deploy', action: 'Deploy the website to a public host', reason: 'Publishing makes the prototype reachable by anyone on the internet.' },
    ...(paid.length ? [{ id: 'purchase', action: 'Purchase paid services or infrastructure', reason: `Finance lists ${paid.length} items that may cost money (about $${project.finance.monthlyLow}–$${project.finance.monthlyHigh}/month, estimates).` }] : []),
    { id: 'accounts', action: 'Create or modify external accounts (hosting, email, domain)', reason: 'External accounts carry billing and security responsibility.' },
    ...(f.has('auth') || f.has('api') ? [{ id: 'credentials', action: 'Use production credentials or API keys', reason: 'Secrets must live on a server, never in this frontend code.' }] : []),
    ...(f.has('auth') || f.has('waitlist') || f.has('contact') || f.has('scanner')
      ? [{ id: 'customer-data', action: 'Handle real customer data', reason: 'Needs server-side storage, a privacy policy, and professional review of the legal questions first.' }]
      : []),
  ]
  return items.map((item) => ({ ...item, status: 'pending', decidedAt: null, note: '' }))
}
