// Server configuration. Reads the project-root .env file (never shipped to the browser).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const envFile = path.join(ROOT_DIR, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

const clean = (value) => String(value ?? '').trim()

const rawMode = clean(process.env.AI_MODE).toLowerCase()
const rawKey = clean(process.env.OPENAI_API_KEY)

export const config = {
  port: Number(process.env.PORT) || 3001,
  // 'mock' (default) = simulated responses, 'openai' = real OpenAI calls.
  aiMode: rawMode === 'openai' ? 'openai' : 'mock',
  aiModeWarning: rawMode && !['mock', 'openai'].includes(rawMode) ? `AI_MODE="${rawMode}" is not valid. Use "mock" or "openai". Falling back to mock.` : null,
  // The placeholder from .env.example counts as "not set".
  openaiKey: /^(your[_-]?api[_-]?key|sk-your)/i.test(rawKey) ? '' : rawKey,
  openaiModel: clean(process.env.OPENAI_MODEL) || 'gpt-4.1-mini',
  openaiBaseUrl: clean(process.env.OPENAI_BASE_URL) || undefined,
  openaiTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || 120000,
  workspaceDir: path.join(ROOT_DIR, 'workspace-projects'),

  // ----- Hosting on the public web (e.g. Render) -----
  // HOSTED=true (Render sets RENDER=true automatically): previews are served by this backend
  // at /preview/<id>/ instead of separate local servers, and server paths are not shown.
  hosted: clean(process.env.HOSTED) === 'true' || clean(process.env.RENDER) === 'true',
  // Public base URL of this backend, used for preview links. Render provides RENDER_EXTERNAL_URL.
  publicUrl: (clean(process.env.PUBLIC_URL) || clean(process.env.RENDER_EXTERNAL_URL)).replace(/\/+$/, ''),
  // Founder access code. When set, Live AI and Build Project require it (sent as X-Access-Code).
  accessCode: clean(process.env.ACCESS_CODE),
  // Extra browser origins allowed to call the API, comma-separated (localhost is always allowed).
  allowedOrigins: clean(process.env.ALLOWED_ORIGINS)
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  maxProjects: Number(process.env.MAX_PROJECTS) || 30,
}
