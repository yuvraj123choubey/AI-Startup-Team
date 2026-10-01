// Project registry. Each project lives in workspace-projects/<id>/ and keeps its
// metadata (status, stages, activity log, reports) in workspace-projects/<id>/.ai-team/project.json.
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { AppError } from '../errors.js'
import { assertInside, projectDir } from './projectFiles.js'
import { getPreview, stopPreview } from './projectExecutor.js'

const projects = new Map()
const STAGE_IDS = ['developer', 'security', 'finance', 'legal', 'operations']
const ACTIVE_STATUSES = new Set(['queued', 'building', 'reviewing'])
const MAX_ACTIVITY = 400

const metaFile = (id) => path.join(projectDir(id), '.ai-team', 'project.json')

export function slugify(name) {
  return (
    String(name || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/, '') || 'project'
  )
}

// secure-login-demo-001, secure-login-demo-002, …
function nextId(name) {
  const base = slugify(name)
  for (let n = 1; n < 1000; n++) {
    const id = `${base}-${String(n).padStart(3, '0')}`
    if (!projects.has(id) && !fs.existsSync(path.join(config.workspaceDir, id))) return id
  }
  throw new AppError('too_many_projects', 'Too many projects with this name.', { status: 400 })
}

function save(project) {
  project.updatedAt = new Date().toISOString()
  const file = metaFile(project.id)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(project, null, 2), 'utf8')
}

export function initProjects() {
  fs.mkdirSync(config.workspaceDir, { recursive: true })
  for (const entry of fs.readdirSync(config.workspaceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    try {
      const project = JSON.parse(fs.readFileSync(metaFile(entry.name), 'utf8'))
      if (project.id !== entry.name) continue
      // A build that was running when the server stopped cannot resume.
      if (ACTIVE_STATUSES.has(project.status)) {
        project.status = 'failed'
        project.currentAgent = null
        project.error = { code: 'interrupted', message: 'The backend stopped while this project was being built. Use “Retry build” to run it again.' }
        pushActivity(project, { roleId: 'system', type: 'error', text: 'Build interrupted because the backend stopped' })
        save(project)
      }
      projects.set(project.id, project)
    } catch {
      // Not a project folder (or unreadable metadata): ignore it.
    }
  }
  return projects.size
}

function pushActivity(project, { roleId = 'system', type = 'info', text }) {
  project.activity.push({ id: (project.activity.at(-1)?.id ?? 0) + 1, at: new Date().toISOString(), roleId, type, text })
  if (project.activity.length > MAX_ACTIVITY) project.activity.splice(0, project.activity.length - MAX_ACTIVITY)
}

export function createProject({ name, task, brief, engine, model }) {
  const id = nextId(name)
  const now = new Date().toISOString()
  const project = {
    id,
    name,
    task,
    framework: 'React + Vite',
    template: 'react-vite',
    engine,
    model: model || null,
    status: 'queued',
    buildStatus: 'pending',
    currentAgent: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    workspace: `workspace-projects/${id}`,
    brief: brief || {},
    stages: Object.fromEntries(STAGE_IDS.map((roleId) => [roleId, { status: 'pending', note: 'Waiting' }])),
    activity: [],
    files: [],
    builds: [],
    developer: null,
    security: { iterations: 0, maxIterations: 3, findings: [], summary: '' },
    finance: null,
    legal: null,
    operations: null,
    approvals: [],
    error: null,
  }
  fs.mkdirSync(projectDir(id), { recursive: true })
  projects.set(id, project)
  pushActivity(project, { roleId: 'operations', type: 'info', text: `Operations created project workspace ${project.workspace}` })
  save(project)
  return project
}

export function getProject(id) {
  const project = projects.get(id)
  if (!project) throw new AppError('not_found', `Project "${id}" was not found.`, { status: 404 })
  return project
}

// Apply a change, stamp it, and persist it.
export function updateProject(id, mutate) {
  const project = getProject(id)
  mutate(project)
  save(project)
  return project
}

export function logActivity(id, roleId, type, text) {
  return updateProject(id, (p) => pushActivity(p, { roleId, type, text }))
}

export function setStage(id, roleId, status, note) {
  return updateProject(id, (p) => {
    p.stages[roleId] = { status, note }
    if (status === 'active') p.currentAgent = roleId
    else if (p.currentAgent === roleId) p.currentAgent = null
  })
}

export function isActive(project) {
  return ACTIVE_STATUSES.has(project.status)
}

// What the frontend receives: metadata plus live preview info and the absolute folder path.
export function publicProject(project, { withActivity = true } = {}) {
  const { brief, ...rest } = project
  const out = {
    ...rest,
    briefName: brief?.name || '',
    absolutePath: projectDir(project.id),
    preview: getPreview(project.id),
  }
  if (!withActivity) {
    delete out.activity
    out.lastActivity = project.activity.at(-1) || null
    delete out.builds
  }
  return out
}

export function listProjects() {
  return [...projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function deleteProject(id) {
  const project = getProject(id)
  if (isActive(project)) throw new AppError('busy', 'This project is still being built. Wait for it to finish before deleting it.', { status: 409 })
  stopPreview(id)
  const dir = projectDir(id)
  assertInside(config.workspaceDir, dir)
  // Retries cover Windows briefly locking files while a stopped preview server exits.
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 })
  projects.delete(id)
}
