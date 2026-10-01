// AI Startup Team backend.
//   GET  /api/health          mode, OpenAI configuration (never the key itself), access-code status
//   POST /api/ai/role         Analyze mode: one role's structured response
//   /api/projects/...         Build mode: projects, files, preview, approvals
//   /preview/<id>/            built projects served as static sites (when hosted on the web)
import path from 'node:path'
import express from 'express'
import { config } from './config.js'
import { sendError } from './errors.js'
import { accessGranted } from './security.js'
import aiRoutes from './routes/ai.js'
import projectRoutes from './routes/projects.js'
import { isOpenAiConfigured } from './services/openaiService.js'
import { stopAllPreviews } from './services/projectExecutor.js'
import { assertProjectId, projectDir } from './services/projectFiles.js'
import { getProject, initProjects } from './services/projectManager.js'

const app = express()
app.disable('x-powered-by')
// Behind a hosting proxy (Render), req.ip must be the visitor's IP for rate limiting.
if (config.hosted) app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))

// Browsers may call the API from localhost (any port) and from ALLOWED_ORIGINS (e.g. the GitHub Pages site).
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || config.allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Code')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/', (req, res) => res.type('text').send('AI Startup Team backend is running. The app itself is on GitHub Pages; this server only answers /api requests.'))

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    aiMode: config.aiMode,
    openaiConfigured: isOpenAiConfigured(),
    model: isOpenAiConfigured() ? config.openaiModel : null,
    warning: config.aiModeWarning,
    workspace: 'workspace-projects/',
    hosted: config.hosted,
    accessCodeRequired: Boolean(config.accessCode),
    accessGranted: accessGranted(req),
  })
})

app.use('/api/ai', aiRoutes)
app.use('/api/projects', projectRoutes)

app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: `No API route ${req.method} ${req.originalUrl}` } }))

// Built projects the founder chose to run, served as static sites.
app.use('/preview/:id', (req, res, next) => {
  let project
  try {
    project = getProject(assertProjectId(req.params.id))
  } catch {
    return res.status(404).type('text').send('Project not found.')
  }
  if (!project.previewEnabled) return res.status(404).type('text').send('This project is not running. Click “Run project” in the AI Startup Team first.')
  // Relative asset paths need the trailing slash.
  if (req.originalUrl.split('?')[0] === `/preview/${project.id}`) return res.redirect(`/preview/${project.id}/`)
  express.static(path.join(projectDir(project.id), 'dist'), { dotfiles: 'deny', index: 'index.html' })(req, res, next)
})

// Malformed JSON bodies and anything unexpected.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'bad_request', message: 'The request body is not valid JSON.' } })
  if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'The request is too large.' } })
  sendError(res, err)
})

const count = initProjects()
const server = app.listen(config.port, () => {
  console.log(`\n  AI Startup Team backend  →  http://localhost:${config.port}`)
  console.log(`  AI mode: ${config.aiMode}${config.aiMode === 'openai' ? ` (model ${config.openaiModel})` : ' (simulated responses)'}`)
  if (config.aiModeWarning) console.warn(`  ! ${config.aiModeWarning}`)
  if (config.aiMode === 'openai' && !isOpenAiConfigured()) console.warn('  ! AI_MODE=openai but OPENAI_API_KEY is missing. Live requests will fail with a clear error.')
  console.log(`  OpenAI key: ${isOpenAiConfigured() ? 'configured' : 'not set'}`)
  if (config.hosted) {
    console.log(`  Hosted mode: previews at ${config.publicUrl || '(set PUBLIC_URL)'}/preview/<id>/`)
    console.log(`  Allowed origins: ${config.allowedOrigins.join(', ') || '(localhost only, set ALLOWED_ORIGINS)'}`)
    if (!config.accessCode) console.warn('  ! ACCESS_CODE is not set: anyone can use Live AI and Build Project on this server.')
  }
  console.log(`  Projects in workspace-projects/: ${count}\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${config.port} is already in use. Stop the other process or set PORT in .env.`)
  else console.error(err)
  process.exit(1)
})

function shutdown() {
  stopAllPreviews()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 1500).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
