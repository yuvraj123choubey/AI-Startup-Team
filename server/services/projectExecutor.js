// Runs the few commands a generated project needs. There is NO general shell access:
// commands come from a fixed allowlist, arguments are fixed strings (plus a port number
// chosen by the server), and model-generated text never becomes part of a command.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { AppError } from '../errors.js'
import { TEMPLATE_SCRIPTS } from './projectTemplates.js'

export const ALLOWED_COMMANDS = {
  // --ignore-scripts: dependency install scripts never run.
  install: { label: 'npm install', args: ['install', '--no-audit', '--no-fund', '--ignore-scripts', '--loglevel=error'], timeoutMs: 300_000 },
  build: { label: 'npm run build', args: ['run', 'build'], timeoutMs: 180_000 },
}

// Find npm's JavaScript entry point so npm runs through Node directly (no shell).
function findNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ]
  return candidates.find((p) => p && p.endsWith('.js') && fs.existsSync(p)) || null
}
const NPM_CLI = findNpmCli()

function npmSpawn(args, cwd) {
  // The child gets no secrets: API keys, tokens, VITE_* values and npm_* settings of the parent are removed.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/OPENAI|API_KEY|SECRET|TOKEN|PASSWORD|^VITE_|^npm_/i.test(key)))
  env.NO_UPDATE_NOTIFIER = '1'
  env.CI = '1'
  if (NPM_CLI) return spawn(process.execPath, [NPM_CLI, ...args], { cwd, env, windowsHide: true })
  // Fallback: npm.cmd needs a shell on Windows. The arguments are still fixed strings from this file.
  return spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, env, windowsHide: true, shell: process.platform === 'win32' })
}

function killTree(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
  else child.kill('SIGTERM')
}

// The template's scripts must be unchanged before anything runs them.
function assertTemplateIntegrity(projectRoot) {
  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
  } catch {
    throw new AppError('integrity', 'package.json is missing or unreadable, so no commands will run.', { status: 400 })
  }
  const ok = Object.entries(TEMPLATE_SCRIPTS).every(([name, cmd]) => pkg.scripts?.[name] === cmd) && Object.keys(pkg.scripts || {}).length === Object.keys(TEMPLATE_SCRIPTS).length
  if (!ok) throw new AppError('integrity', 'package.json scripts differ from the template, so no commands will run.', { status: 400 })
}

const tail = (text, max = 6000) => (text.length > max ? '…' + text.slice(-max) : text)
// Remove ANSI color codes from tool output.
// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '')

export function runProjectCommand(projectRoot, name) {
  const command = ALLOWED_COMMANDS[name]
  if (!command) throw new AppError('command_not_allowed', `The command "${name}" is not on the allowlist.`, { status: 400 })
  assertTemplateIntegrity(projectRoot)

  return new Promise((resolve) => {
    const started = Date.now()
    let output = ''
    let timedOut = false
    const child = npmSpawn(command.args, projectRoot)
    const collect = (chunk) => {
      output = tail(output + stripAnsi(chunk.toString()), 20000)
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, command.timeoutMs)
    const finish = (code, error) => {
      clearTimeout(timer)
      resolve({
        command: command.label,
        ok: !timedOut && !error && code === 0,
        code,
        timedOut,
        durationMs: Date.now() - started,
        output: tail(error ? `${output}\n${error.message}` : output),
      })
    }
    child.on('error', (err) => finish(null, err))
    child.on('close', (code) => finish(code))
  })
}

// ---------- Preview server (RUN PROJECT) ----------

const previews = new Map() // projectId → { child, port, url, startedAt }

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

export async function findFreePort(start = 5174, end = 5299) {
  const used = new Set([...previews.values()].map((p) => p.port))
  for (let port = start; port <= end; port++) {
    if (!used.has(port) && (await portIsFree(port))) return port
  }
  throw new AppError('no_port', `No free port between ${start} and ${end}.`, { status: 503 })
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

export function getPreview(projectId) {
  const p = previews.get(projectId)
  return p ? { url: p.url, port: p.port, startedAt: p.startedAt } : null
}

export async function startPreview(projectId, projectRoot) {
  const existing = getPreview(projectId)
  if (existing) return existing
  assertTemplateIntegrity(projectRoot)
  if (!fs.existsSync(path.join(projectRoot, 'dist', 'index.html'))) {
    throw new AppError('not_built', 'This project has no successful build yet, so there is nothing to run.', { status: 400 })
  }

  const port = await findFreePort()
  const url = `http://localhost:${port}`
  // Serves the production build only on this machine (127.0.0.1), on the port chosen above.
  const child = npmSpawn(['run', 'preview', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], projectRoot)
  let output = ''
  child.stdout.on('data', (c) => (output = tail(output + stripAnsi(c.toString()), 3000)))
  child.stderr.on('data', (c) => (output = tail(output + stripAnsi(c.toString()), 3000)))
  const entry = { child, port, url, startedAt: new Date().toISOString() }
  previews.set(projectId, entry)
  child.on('close', () => {
    if (previews.get(projectId) === entry) previews.delete(projectId)
  })

  const up = await waitForHttp(`http://127.0.0.1:${port}/`, 20_000)
  if (!up) {
    stopPreview(projectId)
    throw new AppError('preview_failed', `The preview server did not start. ${output.trim().split('\n').slice(-3).join(' ')}`, { status: 500 })
  }
  return getPreview(projectId)
}

export function stopPreview(projectId) {
  const entry = previews.get(projectId)
  if (!entry) return false
  previews.delete(projectId)
  killTree(entry.child)
  return true
}

export function stopAllPreviews() {
  for (const id of [...previews.keys()]) stopPreview(id)
}
