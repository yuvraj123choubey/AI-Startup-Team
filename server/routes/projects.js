// Build mode API: create projects, follow their progress, browse files, run a preview,
// and record founder approvals. Approvals are only recorded; nothing is executed.
import { Router } from 'express'
import { config } from '../config.js'
import { AppError, sendError } from '../errors.js'
import { rateLimit, requireAccess } from '../security.js'
import { resolveMode } from './ai.js'
import { enqueueBuild, retryBuild } from '../services/aiOrchestrator.js'
import { isOpenAiConfigured } from '../services/openaiService.js'
import { assertProjectId, listProjectFiles, projectDir, readProjectFile } from '../services/projectFiles.js'
import { startPreview, stopPreview } from '../services/projectExecutor.js'
import { createProject, deleteProject, getProject, isActive, listProjects, logActivity, publicProject, updateProject } from '../services/projectManager.js'

const router = Router()

// Build mode writes files and runs builds on the server: always behind the access code (when one is set).
router.use(requireAccess)
const buildLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, what: 'project builds this hour' })

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (err) {
    sendError(res, err)
  }
}

function withId(req) {
  return assertProjectId(req.params.id)
}

// Live AI needs a key before a project is created, so nothing is half-started.
function checkEngine(engine) {
  if (engine === 'openai' && !isOpenAiConfigured()) {
    throw new AppError('missing_api_key', 'Live AI is selected, but OPENAI_API_KEY is not set in .env on the server. Add it and restart the backend, or use Simulated mode.', {
      status: 400,
      fatal: true,
    })
  }
}

router.get('/', (req, res) => {
  res.json({ projects: listProjects().map((p) => publicProject(p, { withActivity: false })) })
})

router.post(
  '/',
  buildLimit,
  handle((req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const task = typeof req.body?.task === 'string' ? req.body.task.trim() : ''
    if (!name) throw new AppError('bad_request', 'Give the project a name.', { status: 400 })
    if (name.length > 60) throw new AppError('bad_request', 'The project name must be 60 characters or fewer.', { status: 400 })
    if (task.length < 10) throw new AppError('bad_request', 'Describe what to build in at least 10 characters.', { status: 400 })
    if (task.length > 2000) throw new AppError('bad_request', 'The task is too long (max 2,000 characters).', { status: 400 })
    const engine = resolveMode(req.body.mode)
    checkEngine(engine)
    if (listProjects().length >= config.maxProjects) {
      throw new AppError('too_many_projects', `There are already ${config.maxProjects} projects. Delete an old one first.`, { status: 400 })
    }
    const brief = typeof req.body.brief === 'object' && req.body.brief ? Object.fromEntries(Object.entries(req.body.brief).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v.slice(0, 2000)])) : {}

    const project = createProject({ name, task, brief, engine, model: engine === 'openai' ? config.openaiModel : null })
    enqueueBuild(project.id)
    res.status(201).json({ project: publicProject(project) })
  }),
)

router.get(
  '/:id',
  handle((req, res) => {
    res.json({ project: publicProject(getProject(withId(req))) })
  }),
)

router.get(
  '/:id/files',
  handle((req, res) => {
    const id = withId(req)
    getProject(id)
    res.json({ files: listProjectFiles(projectDir(id)) })
  }),
)

router.get(
  '/:id/file',
  handle((req, res) => {
    const id = withId(req)
    getProject(id)
    res.json(readProjectFile(projectDir(id), String(req.query.path || '')))
  }),
)

router.post(
  '/:id/run',
  handle(async (req, res) => {
    const id = withId(req)
    const project = getProject(id)
    if (isActive(project)) throw new AppError('busy', 'Wait for the build to finish before running the project.', { status: 409 })
    if (project.buildStatus !== 'passed') throw new AppError('not_built', 'The project has no passing build, so it cannot run.', { status: 400 })
    if (config.hosted) {
      // On a web host only one port is public, so the backend itself serves the built files.
      updateProject(id, (p) => (p.previewEnabled = true))
      const preview = publicProject(getProject(id)).preview
      logActivity(id, 'system', 'info', `Founder published a preview at ${preview.url}`)
      return res.json({ preview })
    }
    const preview = await startPreview(id, projectDir(id))
    logActivity(id, 'system', 'info', `Founder started a local preview at ${preview.url}`)
    res.json({ preview })
  }),
)

router.post(
  '/:id/stop',
  handle((req, res) => {
    const id = withId(req)
    const project = getProject(id)
    if (config.hosted && project.previewEnabled) {
      updateProject(id, (p) => (p.previewEnabled = false))
      logActivity(id, 'system', 'info', 'Founder stopped the preview')
    } else if (stopPreview(id)) logActivity(id, 'system', 'info', 'Founder stopped the local preview')
    res.json({ ok: true })
  }),
)

router.post(
  '/:id/retry',
  buildLimit,
  handle((req, res) => {
    const id = withId(req)
    const engine = resolveMode(req.body?.mode || getProject(id).engine)
    checkEngine(engine)
    res.json({ project: publicProject(retryBuild(id, engine)) })
  }),
)

router.post(
  '/:id/approvals/:approvalId',
  handle((req, res) => {
    const id = withId(req)
    const decision = req.body?.decision
    if (!['approved', 'declined', 'pending'].includes(decision)) throw new AppError('bad_request', 'decision must be "approved", "declined" or "pending".', { status: 400 })
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : ''
    let label = ''
    updateProject(id, (p) => {
      const item = p.approvals.find((a) => a.id === req.params.approvalId)
      if (!item) throw new AppError('not_found', 'Approval item not found.', { status: 404 })
      item.status = decision
      item.note = note
      item.decidedAt = decision === 'pending' ? null : new Date().toISOString()
      label = item.action
    })
    logActivity(id, 'founder', 'info', `Founder ${decision === 'pending' ? 'reset' : decision} “${label}” (recorded only; nothing was executed)`)
    res.json({ project: publicProject(getProject(id)) })
  }),
)

router.delete(
  '/:id',
  handle((req, res) => {
    const id = withId(req)
    // The founder must type/confirm the project id, so a stray request cannot delete a project.
    if (req.query.confirm !== id) throw new AppError('confirmation_required', 'Deleting a project needs confirmation.', { status: 400 })
    deleteProject(id)
    res.json({ ok: true })
  }),
)

export default router
