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
}
