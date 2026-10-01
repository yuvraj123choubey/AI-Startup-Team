// AI Startup Team backend.
//   GET  /api/health          mode, OpenAI configuration (never the key itself)
//   POST /api/ai/role         Analyze mode: one role's structured response
//   /api/projects/...         Build mode: projects, files, preview, approvals
import express from 'express'
import { config } from './config.js'
import { sendError } from './errors.js'
import aiRoutes from './routes/ai.js'
import projectRoutes from './routes/projects.js'
import { isOpenAiConfigured } from './services/openaiService.js'
import { stopAllPreviews } from './services/projectExecutor.js'
import { initProjects } from './services/projectManager.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

// Allow the Vite dev server / preview (any localhost port) to call the API directly.
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    aiMode: config.aiMode,
    openaiConfigured: isOpenAiConfigured(),
    model: isOpenAiConfigured() ? config.openaiModel : null,
    warning: config.aiModeWarning,
    workspace: 'workspace-projects/',
  })
})

app.use('/api/ai', aiRoutes)
app.use('/api/projects', projectRoutes)

app.use('/api', (req, res) => res.status(404).json({ error: { code: 'not_found', message: `No API route ${req.method} ${req.originalUrl}` } }))

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
