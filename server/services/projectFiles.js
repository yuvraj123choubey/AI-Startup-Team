// Safe file access for generated projects.
//
// SECURITY RULE: AI-generated paths are untrusted input. They are validated here and can
// never be written outside workspace-projects/<project-id>/. The AI may only write source
// files under src/ or public/ (plus index.html and README.md). It can never write
// package.json, vite.config.js, dotfiles, or anything else that npm or Node would execute,
// because those could turn a "build" into arbitrary code execution.
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { AppError } from '../errors.js'

export const MAX_FILES_PER_WRITE = 60
export const MAX_FILE_BYTES = 200_000
const MAX_READ_BYTES = 400_000

const AI_WRITABLE_DIRS = ['src/', 'public/']
const AI_WRITABLE_ROOT_FILES = ['index.html', 'README.md']
const AI_WRITABLE_EXTENSIONS = new Set(['.js', '.jsx', '.css', '.json', '.md', '.svg', '.txt', '.html'])
// Template files the AI may read but never replace.
const PROTECTED_FILES = new Set(['src/main.jsx'])
const HIDDEN_FROM_LISTING = new Set(['node_modules', 'dist', '.ai-team'])

const PROJECT_ID = /^[a-z0-9][a-z0-9-]{0,80}$/

export function assertProjectId(id) {
  if (typeof id !== 'string' || !PROJECT_ID.test(id)) throw new AppError('bad_request', 'Invalid project id.', { status: 400 })
  return id
}

export function projectDir(id) {
  assertProjectId(id)
  const dir = path.resolve(config.workspaceDir, id)
  assertInside(config.workspaceDir, dir)
  return dir
}

const sameCase = (p) => (process.platform === 'win32' ? p.toLowerCase() : p)

// Throws unless `target` is strictly inside `root`.
export function assertInside(root, target) {
  const rootResolved = sameCase(path.resolve(root)) + path.sep
  if (!sameCase(path.resolve(target)).startsWith(rootResolved)) {
    throw new AppError('unsafe_path', 'Blocked a path outside the project workspace.', { status: 400 })
  }
}

// Structural checks shared by reads and writes. Returns a clean relative POSIX path.
function checkShape(rel) {
  if (typeof rel !== 'string') throw new AppError('unsafe_path', 'File path must be a string.', { status: 400 })
  const p = rel.trim()
  const reject = (reason) => {
    throw new AppError('unsafe_path', `Rejected file path "${p.slice(0, 120)}": ${reason}.`, { status: 400 })
  }
  if (!p || p.length > 200) reject('empty or too long')
  if (p.includes('\0')) reject('contains a null byte')
  if (p.includes('\\')) reject('backslashes are not allowed')
  if (p.startsWith('/') || p.startsWith('~') || /^[a-zA-Z]:/.test(p)) reject('absolute paths are not allowed')
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) reject('only letters, numbers, dot, dash, underscore and / are allowed')
  const segments = p.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) reject('".." and empty path segments are not allowed')
  if (segments.some((s) => s.startsWith('.'))) reject('hidden files and folders are not allowed')
  return p
}

// Validate a path the AI wants to WRITE. Returns { rel, abs }.
export function validateWritePath(projectRoot, rel) {
  const p = checkShape(rel)
  const reject = (reason) => {
    throw new AppError('unsafe_path', `Rejected file path "${p}": ${reason}.`, { status: 400 })
  }
  const allowedPlace = AI_WRITABLE_ROOT_FILES.includes(p) || AI_WRITABLE_DIRS.some((dir) => p.startsWith(dir))
  if (!allowedPlace) reject('the AI may only write inside src/ or public/, or index.html and README.md')
  if (PROTECTED_FILES.has(p)) reject('this template file is protected')
  if (p.split('/').some((s) => s === 'node_modules' || s === 'dist')) reject('build and dependency folders are off limits')
  if (!AI_WRITABLE_EXTENSIONS.has(path.extname(p).toLowerCase())) reject(`file type ${path.extname(p) || '(none)'} is not allowed`)
  const abs = path.resolve(projectRoot, p)
  assertInside(projectRoot, abs)
  return { rel: p, abs }
}

// Validate a path the founder wants to READ (template files are readable, internals are not).
export function validateReadPath(projectRoot, rel) {
  const p = checkShape(rel)
  if (HIDDEN_FROM_LISTING.has(p.split('/')[0])) throw new AppError('unsafe_path', 'That folder is not viewable.', { status: 400 })
  const abs = path.resolve(projectRoot, p)
  assertInside(projectRoot, abs)
  return { rel: p, abs }
}

// Write AI-generated files. Everything is validated first; if one path is unsafe it is
// skipped and reported, and the rest are written.
export function writeAiFiles(projectRoot, files) {
  if (!Array.isArray(files)) throw new AppError('invalid_response', 'The Developer returned no file list.', { status: 502 })
  const results = []
  const rejected = []
  const seen = new Set()
  for (const file of files.slice(0, MAX_FILES_PER_WRITE)) {
    try {
      const { rel, abs } = validateWritePath(projectRoot, file?.path)
      if (seen.has(rel)) continue
      seen.add(rel)
      if (typeof file.content !== 'string') throw new AppError('invalid_file', `File "${rel}" has no text content.`)
      if (Buffer.byteLength(file.content, 'utf8') > MAX_FILE_BYTES) throw new AppError('invalid_file', `File "${rel}" is larger than ${MAX_FILE_BYTES / 1000} KB.`)
      const existed = fs.existsSync(abs)
      if (existed && fs.readFileSync(abs, 'utf8') === file.content) {
        results.push({ path: rel, action: 'unchanged' })
        continue
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      // Defence against symlinked folders: the real parent folder must still be inside the project.
      assertInside(fs.realpathSync(projectRoot), path.join(fs.realpathSync(path.dirname(abs)), 'file'))
      fs.writeFileSync(abs, file.content, 'utf8')
      results.push({ path: rel, action: existed ? 'updated' : 'created' })
    } catch (err) {
      rejected.push({ path: String(file?.path ?? '').slice(0, 120), reason: err.message })
    }
  }
  if (files.length > MAX_FILES_PER_WRITE) rejected.push({ path: '(extra files)', reason: `Only ${MAX_FILES_PER_WRITE} files are accepted per step.` })
  return { results, rejected }
}

// Write trusted template files generated by the server itself (still kept inside the project).
export function writeTemplateFiles(projectRoot, files) {
  for (const file of files) {
    const abs = path.resolve(projectRoot, file.path)
    assertInside(projectRoot, abs)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, file.content, 'utf8')
  }
}

// Remove generated source folders before a fresh build attempt (inside the project only).
export function clearGeneratedSources(projectRoot) {
  for (const name of ['src', 'public', 'dist']) {
    const abs = path.resolve(projectRoot, name)
    assertInside(projectRoot, abs)
    fs.rmSync(abs, { recursive: true, force: true })
  }
}

export function listProjectFiles(projectRoot) {
  const out = []
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (HIDDEN_FROM_LISTING.has(entry.name) || entry.name.startsWith('.') || entry.isSymbolicLink()) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(abs, rel)
      else out.push({ path: rel, size: fs.statSync(abs).size })
    }
  }
  if (fs.existsSync(projectRoot)) walk(projectRoot, '')
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export function readProjectFile(projectRoot, rel) {
  const { rel: clean, abs } = validateReadPath(projectRoot, rel)
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new AppError('not_found', `File "${clean}" does not exist.`, { status: 404 })
  if (fs.statSync(abs).size > MAX_READ_BYTES) throw new AppError('too_large', `File "${clean}" is too large to show.`, { status: 400 })
  return { path: clean, content: fs.readFileSync(abs, 'utf8') }
}

// Read the project's own source files (for the Security review and Developer fixes).
export function readSourceFiles(projectRoot, { maxTotalBytes = 120_000 } = {}) {
  let total = 0
  return listProjectFiles(projectRoot)
    .filter((f) => /^(src|public)\//.test(f.path) || f.path === 'index.html')
    .filter((f) => /\.(jsx?|css|html|json|md|svg)$/.test(f.path))
    .map((f) => ({ path: f.path, content: fs.readFileSync(path.join(projectRoot, f.path), 'utf8') }))
    .filter((f) => {
      total += f.content.length
      return total <= maxTotalBytes
    })
}
