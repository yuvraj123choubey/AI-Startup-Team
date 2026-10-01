// Starts the backend (Express, port 3001) and the frontend (Vite, port 5173) together.
// Ctrl+C stops both. Equivalent to running "npm run server" and "npm run dev" in two terminals.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const children = [
  spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [path.join('node_modules', 'vite', 'bin', 'vite.js')], { cwd: root, stdio: 'inherit' }),
]

function stop() {
  children.forEach((child) => child.exitCode === null && child.kill())
  process.exit(0)
}

children.forEach((child) => child.on('exit', (code) => code && stop()))
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
