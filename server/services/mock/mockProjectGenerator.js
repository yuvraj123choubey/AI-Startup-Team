// Simulated Software Developer for Build mode.
//
// It writes a real, buildable React + Vite application whose pages and components are
// chosen from the founder's task (login, dashboard, landing page, portfolio, admin panel,
// API frontend, security tool, contact form…). It is not limited to login systems.
//
// Like a real first draft, version 1 contains a few common prototype mistakes
// (for example plain-text passwords). The Security Reviewer's automated scanner finds
// them in the actual code, and the Developer's fix step regenerates the affected files
// with the matching hardening switched on. The build and the re-scan are both real.

// Security finding rule id → hardening switch the Developer turns on to fix it.
export const FIX_FOR_RULE = {
  'plaintext-password-storage': 'hashPasswords',
  'account-enumeration': 'genericErrors',
  'session-no-expiry': 'sessionExpiry',
  'weak-password-policy': 'strongPasswordPolicy',
  'dangerous-html': 'safeRendering',
  'hardcoded-secret': 'noHardcodedKey',
  'missing-authorization': 'adminRoleCheck',
  'unsafe-external-link': 'safeExternalLinks',
  'insecure-http': 'httpsOnly',
}

export const FIX_DESCRIPTIONS = {
  hashPasswords: 'Replaced plain-text passwords with salted PBKDF2 hashes (Web Crypto API)',
  genericErrors: 'Replaced account-revealing login errors with one generic message',
  sessionExpiry: 'Added a 30-minute session expiry that is checked on every read',
  strongPasswordPolicy: 'Raised the minimum password length',
  safeRendering: 'Rendered the email preview as escaped React text instead of raw HTML',
  noHardcodedKey: 'Removed the hard-coded API key from frontend code',
  adminRoleCheck: 'Added an administrator role check to the admin page',
  safeExternalLinks: 'Added rel="noopener noreferrer" to external links',
  httpsOnly: 'Switched external URLs to https://',
}

const PALETTES = ['#4f46e5', '#0d9488', '#2563eb', '#7c3aed', '#db2777', '#d97706']

// ---------- Task analysis ----------

export function analyzeTask(name, task) {
  const text = `${name} ${task}`.toLowerCase()
  const features = new Set()
  const waitlist = /\b(waitlist|wait list|newsletter|early access)\b/.test(text)

  if (/\b(log ?in|log ?out|sign ?in|sign ?out|register|registration|authenticat\w*|auth|passwords?|user accounts?|accounts?)\b/.test(text) || (/\bsign ?up\b/.test(text) && !waitlist)) {
    features.add('auth')
  }
  if (features.has('auth') || /\b(dashboard|analytics|metrics|stats|reporting)\b/.test(text)) features.add('dashboard')
  if (/\badmin\w*\b/.test(text)) features.add('admin')
  if (/\b(portfolio|resume|cv|personal (site|website))\b/.test(text)) features.add('portfolio')
  if (/\b(phish\w*|scan\w*|security tool|cyber\w*|threats?|suspicious|malware)\b/.test(text)) features.add('scanner')
  if (/\bapis?\b|\brest\b|fetch data/.test(text)) features.add('api')
  if (/\bcontact\b/.test(text)) features.add('contact')
  if (waitlist || /\b(landing|marketing|homepage|home page|launch page|product page|mvp)\b/.test(text)) features.add('landing')
  if (waitlist) features.add('waitlist')
  // Nothing specific requested: build a product landing page.
  if (![...features].some((f) => f !== 'contact')) features.add('landing')
  if (features.has('landing')) features.add('waitlist')

  return { name, task, features }
}

export function slugify(name) {
  return String(name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'app'
}

// Pages the app will have, in navigation order.
export function planPages(features) {
  const pages = [{ route: '/', file: 'Home', title: 'Home', nav: 'Home' }]
  if (features.has('scanner')) pages.push({ route: '/scanner', file: 'Scanner', title: 'Email check', nav: 'Email check', requiresAuth: false })
  if (features.has('api')) pages.push({ route: '/explorer', file: 'ApiExplorer', title: 'API explorer', nav: 'API explorer' })
  if (features.has('portfolio')) pages.push({ route: '/work', file: 'Portfolio', title: 'Work', nav: 'Work' })
  if (features.has('contact')) pages.push({ route: '/contact', file: 'Contact', title: 'Contact', nav: 'Contact' })
  if (features.has('dashboard')) pages.push({ route: '/dashboard', file: 'Dashboard', title: 'Dashboard', nav: 'Dashboard', requiresAuth: features.has('auth') })
  if (features.has('admin')) pages.push({ route: '/admin', file: 'Admin', title: 'Admin', nav: 'Admin', requiresAuth: features.has('auth'), requiresAdmin: true })
  if (features.has('auth')) {
    pages.push({ route: '/login', file: 'Login', title: 'Log in', guestOnly: true })
    pages.push({ route: '/register', file: 'Register', title: 'Create account', guestOnly: true })
  }
  return pages
}

export function describePlan(spec) {
  const f = spec.features
  const pages = planPages(f)
  const plan = [
    'Use the React + Vite template with a tiny hash router (no extra dependencies)',
    `Pages: ${pages.map((p) => p.title).join(', ')}`,
  ]
  if (f.has('auth')) plan.push('Accounts: registration, login, logout, protected dashboard, password validation with a strength meter')
  if (f.has('scanner')) plan.push('Email check: heuristic phishing signals with a highlighted preview')
  if (f.has('api')) plan.push('API explorer: fetch and display data from a public read-only API')
  if (f.has('admin')) plan.push('Admin panel: user table with roles')
  if (f.has('waitlist')) plan.push('Waitlist form with email validation and explicit consent')
  if (f.has('portfolio')) plan.push('Portfolio: project cards, skills, and contact links')
  plan.push('Shared layout: navigation bar, footer, responsive styles')
  return plan
}

// ---------- File generators ----------
// Note: generated code avoids template literals so this file can use them freely.

function routerFile() {
  return `import { useEffect, useState } from 'react'

// Tiny hash router (#/login, #/dashboard …) so the app needs no extra dependency.
function currentPath() {
  const hash = window.location.hash.replace(/^#/, '')
  return hash.startsWith('/') ? hash : '/'
}

export function navigate(path) {
  window.location.hash = path
}

export function useRoute() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return path
}
`
}

function linkFile() {
  return `import { navigate } from '../router.js'

export default function Link({ to, children, className = '', ...rest }) {
  return (
    <a
      href={'#' + to}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
`
}

function appFile(spec, fixes) {
  const f = spec.features
  const pages = planPages(f)
  const auth = f.has('auth')
  const adminCheck = auth && f.has('admin') && fixes.has('adminRoleCheck')
  const imports = [
    "import { useEffect } from 'react'",
    "import Navbar from './components/Navbar.jsx'",
    "import Footer from './components/Footer.jsx'",
    "import { navigate, useRoute } from './router.js'",
    auth ? "import { useAuth } from './hooks/useAuth.js'" : null,
    adminCheck ? "import { isAdmin } from './services/authService.js'" : null,
    ...pages.map((p) => `import ${p.file} from './pages/${p.file}.jsx'`),
    "import './styles/app.css'",
  ].filter(Boolean)

  const routes = pages
    .map((p) => {
      const flags = [p.requiresAuth ? 'requiresAuth: true' : null, p.guestOnly ? 'guestOnly: true' : null, adminCheck && p.requiresAdmin ? 'requiresAdmin: true' : null].filter(Boolean)
      return `  '${p.route}': { page: ${p.file}, title: '${p.title}'${flags.length ? ', ' + flags.join(', ') : ''} },`
    })
    .join('\n')

  return `${imports.join('\n')}

export const APP_NAME = ${JSON.stringify(spec.name)}

const ROUTES = {
${routes}
}

function Redirect({ to }) {
  useEffect(() => {
    navigate(to)
  }, [to])
  return null
}

function NotFound() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p className="muted">That page does not exist.</p>
      <a className="button" href="#/">Back to home</a>
    </section>
  )
}
${
  adminCheck
    ? `
function AccessDenied() {
  return (
    <section className="empty">
      <h1>Access denied</h1>
      <p className="muted">Only administrators can open this page.</p>
      <a className="button" href="#/dashboard">Back to dashboard</a>
    </section>
  )
}
`
    : ''
}
export default function App() {
  const path = useRoute()
  ${auth ? 'const { user } = useAuth()' : 'const user = null'}
  const route = ROUTES[path]

  useEffect(() => {
    document.title = route ? route.title + ' · ' + APP_NAME : APP_NAME
  }, [route])

  let content
  if (!route) content = <NotFound />
  else if (route.requiresAuth && !user) content = <Redirect to="/login" />
  else if (route.guestOnly && user) content = <Redirect to="/dashboard" />
${adminCheck ? '  else if (route.requiresAdmin && !isAdmin(user)) content = <AccessDenied />\n' : ''}  else {
    const Page = route.page
    content = <Page user={user} />
  }

  return (
    <div className="app">
      <Navbar path={path} user={user} />
      <main className="main">{content}</main>
      <Footer />
    </div>
  )
}
`
}

function navbarFile(spec) {
  const f = spec.features
  const auth = f.has('auth')
  const links = planPages(f).filter((p) => p.nav && !(auth && p.requiresAuth))
  const authed = planPages(f).filter((p) => p.nav && auth && p.requiresAuth)
  const initials = escapeJsx(spec.name)
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return `import Link from './Link.jsx'
${auth ? "import { logout } from '../services/authService.js'\nimport { navigate } from '../router.js'\n" : ''}
const LINKS = ${JSON.stringify(links.map((p) => ({ to: p.route, label: p.nav })), null, 2)}
${auth ? `const MEMBER_LINKS = ${JSON.stringify(authed.map((p) => ({ to: p.route, label: p.nav })), null, 2)}\n` : ''}
export default function Navbar({ path${auth ? ', user' : ''} }) {
${
  auth
    ? `  function handleLogout() {
    logout()
    navigate('/login')
  }

  const links = user ? LINKS.concat(MEMBER_LINKS) : LINKS
`
    : '  const links = LINKS\n'
}
  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden="true">${initials}</span>
        ${escapeJsx(spec.name)}
      </Link>
      <nav className="nav-links" aria-label="Main">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className={'nav-link' + (path === link.to ? ' active' : '')} aria-current={path === link.to ? 'page' : undefined}>
            {link.label}
          </Link>
        ))}
${
  auth
    ? `        {user ? (
          <button type="button" className="button" onClick={handleLogout}>
            Log out
          </button>
        ) : (
          <>
            <Link to="/login" className={'nav-link' + (path === '/login' ? ' active' : '')}>
              Log in
            </Link>
            <Link to="/register" className="button primary">
              Sign up
            </Link>
          </>
        )}
`
    : ''
}      </nav>
    </header>
  )
}
`
}

function footerFile(spec) {
  return `export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} ${escapeJsx(spec.name)} · Prototype built with the AI Startup Team · Not for real customer data yet
    </footer>
  )
}
`
}

function escapeJsx(text) {
  return String(text).replace(/[{}<>]/g, '')
}

function featureCards(f) {
  const cards = []
  if (f.has('auth')) cards.push({ title: 'Your own account', text: 'Register, log in and log out. Passwords must pass clear validation rules.' })
  if (f.has('dashboard')) cards.push({ title: 'Dashboard', text: 'See the numbers that matter at a glance.' })
  if (f.has('scanner')) cards.push({ title: 'Email check', text: 'Paste a suspicious email and see the warning signs highlighted.' })
  if (f.has('api')) cards.push({ title: 'API explorer', text: 'Browse live data from a public API right in the browser.' })
  if (f.has('admin')) cards.push({ title: 'Admin panel', text: 'Review the people who use the product and their roles.' })
  if (f.has('portfolio')) cards.push({ title: 'Selected work', text: 'Projects, skills and the story behind them.' })
  if (f.has('waitlist')) cards.push({ title: 'Early access', text: 'Join the waitlist and hear first when we launch.' })
  if (f.has('contact')) cards.push({ title: 'Talk to us', text: 'Send a message through a validated contact form.' })
  while (cards.length < 3) cards.push([{ title: 'Fast', text: 'Built with React and Vite for quick loading.' }, { title: 'Responsive', text: 'Works on phones, tablets and desktops.' }, { title: 'Simple', text: 'Small codebase one founder can maintain.' }][cards.length])
  return cards.slice(0, 6)
}

function homeFile(spec, brief) {
  const f = spec.features
  const primary = f.has('auth')
    ? { to: '/register', label: 'Create an account' }
    : f.has('scanner')
      ? { to: '/scanner', label: 'Check an email' }
      : f.has('api')
        ? { to: '/explorer', label: 'Open the API explorer' }
        : f.has('portfolio')
          ? { to: '/work', label: 'See my work' }
          : f.has('dashboard')
            ? { to: '/dashboard', label: 'Open the dashboard' }
            : null
  const secondary = f.has('auth') ? { to: '/login', label: 'Log in' } : f.has('contact') ? { to: '/contact', label: 'Contact' } : null
  const subtitle = brief?.product && !f.has('portfolio') ? brief.product : spec.task
  const imports = ["import Link from '../components/Link.jsx'", "import FeatureGrid from '../components/FeatureGrid.jsx'", f.has('waitlist') ? "import WaitlistForm from '../components/WaitlistForm.jsx'" : null].filter(Boolean)

  return `${imports.join('\n')}

const FEATURES = ${JSON.stringify(featureCards(f), null, 2)}

export default function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">${f.has('portfolio') ? 'Portfolio' : f.has('landing') ? 'Coming soon' : 'Welcome'}</p>
        <h1>${escapeJsx(spec.name)}</h1>
        <p>{${JSON.stringify(subtitle.slice(0, 220))}}</p>
        <div className="actions">
${primary ? `          <Link to="${primary.to}" className="button primary">\n            ${primary.label}\n          </Link>\n` : f.has('waitlist') ? '          <a href="#waitlist" className="button primary">Join the waitlist</a>\n' : ''}${secondary ? `          <Link to="${secondary.to}" className="button">\n            ${secondary.label}\n          </Link>\n` : ''}        </div>
      </section>

      <section className="section">
        <h2>What you can do</h2>
        <FeatureGrid features={FEATURES} />
      </section>
${
  f.has('waitlist')
    ? `
      <section className="section" id="waitlist">
        <h2>Join the waitlist</h2>
        <WaitlistForm />
      </section>
`
    : ''
}    </>
  )
}
`
}

function featureGridFile() {
  return `export default function FeatureGrid({ features }) {
  return (
    <div className="grid">
      {features.map((feature) => (
        <article key={feature.title} className="card">
          <h3>{feature.title}</h3>
          <p className="muted">{feature.text}</p>
        </article>
      ))}
    </div>
  )
}
`
}

function waitlistFile(spec) {
  return `import { useState } from 'react'

const STORAGE_KEY = '${spec.slug}.waitlist'
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/

// Prototype: signups are kept in this browser only. Connect a backend before launch.
export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  function handleSubmit(event) {
    event.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(clean) || clean.length > 254) {
      setStatus({ type: 'error', message: 'Enter a valid email address.' })
      return
    }
    if (!consent) {
      setStatus({ type: 'error', message: 'Please agree to receive launch emails.' })
      return
    }
    let list = []
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch {
      list = []
    }
    if (!list.some((entry) => entry.email === clean)) {
      list.push({ email: clean, consentAt: new Date().toISOString() })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    }
    setEmail('')
    setConsent(false)
    setStatus({ type: 'success', message: 'You are on the list. We will email you at launch.' })
  }

  return (
    <form className="card form wide" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
      </label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I agree to receive emails about the launch. I can unsubscribe at any time.</span>
      </label>
      {status.message && (
        <p className={status.type === 'error' ? 'form-error' : 'form-success'} role={status.type === 'error' ? 'alert' : 'status'}>
          {status.message}
        </p>
      )}
      <button type="submit" className="button primary">
        Join the waitlist
      </button>
    </form>
  )
}
`
}

// ----- Accounts -----

function authServiceFile(spec, fixes) {
  const hash = fixes.has('hashPasswords')
  const generic = fixes.has('genericErrors')
  const expiry = fixes.has('sessionExpiry')
  const admin = spec.features.has('admin')
  const adminCheck = admin && fixes.has('adminRoleCheck')

  let loginBody
  if (generic && hash) {
    loginBody = `  const valid = user ? await verifyPassword(password, user.passwordHash, user.salt) : false
  if (!valid) {
    // Same message whether the email or the password was wrong, so accounts cannot be discovered.
    throw new Error('Invalid email or password.')
  }`
  } else if (generic) {
    loginBody = `  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.')
  }`
  } else if (hash) {
    loginBody = `  if (!user) {
    throw new Error('No account found with that email.')
  }
  const valid = await verifyPassword(password, user.passwordHash, user.salt)
  if (!valid) {
    throw new Error('Incorrect password.')
  }`
  } else {
    loginBody = `  if (!user) {
    throw new Error('No account found with that email.')
  }
  if (user.password !== password) {
    throw new Error('Incorrect password.')
  }`
  }

  return `// Browser-only account store for this prototype.
// Accounts live in localStorage, so this demonstrates the user flow; it is not production authentication.
${hash ? "import { hashPassword, verifyPassword } from './passwordHash.js'\n" : ''}
const USERS_KEY = '${spec.slug}.users'
const SESSION_KEY = '${spec.slug}.session'
${expiry ? 'const SESSION_TTL_MS = 30 * 60 * 1000 // sessions expire after 30 minutes\n' : ''}const listeners = new Set()

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function startSession(user) {
  const session = { userId: user.id, name: user.name, email: user.email, role: user.role${expiry ? ', expiresAt: Date.now() + SESSION_TTL_MS' : ''} }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  notify()
  return session
}

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
${
  expiry
    ? `    if (session && !(session.expiresAt > Date.now())) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
`
    : ''
}    return session || null
  } catch {
    return null
  }
}

export async function register({ name, email, password }) {
  const users = readUsers()
  const normalizedEmail = email.trim().toLowerCase()
  if (users.some((existing) => existing.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.')
  }
${hash ? '  const { hash, salt } = await hashPassword(password)\n' : ''}  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
${hash ? '    passwordHash: hash,\n    salt,\n' : '    password,\n'}    // The first account created on this device becomes the owner.
    role: users.length === 0 ? 'admin' : 'member',
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  writeUsers(users)
  return startSession(user)
}

export async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = readUsers().find((candidate) => candidate.email === normalizedEmail)
${loginBody}
  return startSession(user)
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  notify()
}
${
  admin
    ? `
// Safe list for the admin page: never includes password data.
export function listUsers() {
  return readUsers().map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }))
}
`
    : ''
}${
  adminCheck
    ? `
export function isAdmin(session) {
  return Boolean(session && session.role === 'admin')
}
`
    : ''
}`
}

function passwordHashFile() {
  return `// Salted PBKDF2 password hashing with the browser's built-in Web Crypto API.
const ITERATIONS = 210000

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex) {
  return new Uint8Array(hex.match(/.{2}/g).map((pair) => parseInt(pair, 16)))
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256)
  return toHex(new Uint8Array(bits))
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { hash: await derive(password, salt), salt: toHex(salt) }
}

export async function verifyPassword(password, expectedHash, saltHex) {
  if (!expectedHash || !saltHex) return false
  const actual = await derive(password, fromHex(saltHex))
  // Compare every character so the time taken does not reveal how much matched.
  let diff = actual.length ^ expectedHash.length
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ (expectedHash.charCodeAt(i) || 0)
  return diff === 0
}
`
}

function passwordRulesFile(fixes) {
  return `export const MIN_PASSWORD_LENGTH = ${fixes.has('strongPasswordPolicy') ? 12 : 8}

const COMMON_PASSWORDS = ['password', 'password1', 'password123', '12345678', '123456789', 'qwerty123', 'letmein1', 'iloveyou', 'admin123', 'welcome1']

export function checkPassword(password) {
  const checks = [
    { id: 'length', label: 'At least ' + MIN_PASSWORD_LENGTH + ' characters', ok: password.length >= MIN_PASSWORD_LENGTH },
    { id: 'letter', label: 'A letter', ok: /[A-Za-z]/.test(password) },
    { id: 'number', label: 'A number', ok: /\\d/.test(password) },
    { id: 'symbol', label: 'A symbol such as ! ? #', ok: /[^A-Za-z0-9]/.test(password) },
    { id: 'common', label: 'Not a common password', ok: password.length > 0 && !COMMON_PASSWORDS.includes(password.toLowerCase()) },
  ]
  const score = checks.filter((check) => check.ok).length
  return { checks, score, valid: checks.every((check) => check.ok) }
}

export function validateEmail(email) {
  const value = email.trim()
  return value.length <= 254 && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(value)
}
`
}

function authHookFile() {
  return `import { useEffect, useState } from 'react'
import { getSession, subscribe } from '../services/authService.js'

// Current signed-in user. Updates on login/logout and when another tab changes the session.
export function useAuth() {
  const [user, setUser] = useState(getSession)
  useEffect(() => {
    const refresh = () => setUser(getSession())
    const unsubscribe = subscribe(refresh)
    window.addEventListener('storage', refresh)
    const timer = setInterval(refresh, 60000)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', refresh)
      clearInterval(timer)
    }
  }, [])
  return { user }
}
`
}

function passwordStrengthFile() {
  return `import { checkPassword } from '../services/passwordRules.js'

const LABELS = ['Very weak', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong']

export default function PasswordStrength({ password }) {
  if (!password) return null
  const { checks, score } = checkPassword(password)
  return (
    <div className="strength" aria-live="polite">
      <div className="strength-bar">
        <span className={'strength-fill level-' + score} style={{ width: (score / checks.length) * 100 + '%' }} />
      </div>
      <p className="strength-label">{LABELS[score]}</p>
      <ul className="strength-checks">
        {checks.map((check) => (
          <li key={check.id} className={check.ok ? 'ok' : ''}>
            {check.ok ? '✓' : '○'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
`
}

function loginFormFile() {
  return `import { useState } from 'react'
import { login } from '../services/authService.js'
import { validateEmail } from '../services/passwordRules.js'
import { navigate } from '../router.js'
import Link from './Link.jsx'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!validateEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h1>Welcome back</h1>
      <p className="muted">Log in to continue to your dashboard.</p>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Log in'}
      </button>
      <p className="muted small">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  )
}
`
}

function registerFormFile() {
  return `import { useState } from 'react'
import { register } from '../services/authService.js'
import { checkPassword, validateEmail } from '../services/passwordRules.js'
import { navigate } from '../router.js'
import Link from './Link.jsx'
import PasswordStrength from './PasswordStrength.jsx'

export default function RegisterForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [understood, setUnderstood] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  function validate() {
    if (!form.name.trim()) return 'Enter your name.'
    if (form.name.trim().length > 80) return 'Name must be 80 characters or fewer.'
    if (!validateEmail(form.email)) return 'Enter a valid email address.'
    if (!checkPassword(form.password).valid) return 'Choose a password that meets every rule below.'
    if (form.password !== form.confirm) return 'The passwords do not match.'
    if (!understood) return 'Please confirm you understand this is a prototype.'
    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const problem = validate()
    setError(problem)
    if (problem) return
    setSubmitting(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit} noValidate>
      <h1>Create your account</h1>
      <p className="muted">It takes less than a minute.</p>
      <label className="field">
        <span>Name</span>
        <input type="text" autoComplete="name" value={form.name} maxLength={80} onChange={update('name')} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={form.email} maxLength={254} onChange={update('email')} required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" autoComplete="new-password" value={form.password} onChange={update('password')} required />
      </label>
      <PasswordStrength password={form.password} />
      <label className="field">
        <span>Confirm password</span>
        <input type="password" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} required />
      </label>
      <label className="check">
        <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
        <span>I understand this is a prototype and my account is stored only in this browser.</span>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </button>
      <p className="muted small">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </form>
  )
}
`
}

function authPageFile(kind) {
  const form = kind === 'Login' ? 'LoginForm' : 'RegisterForm'
  return `import ${form} from '../components/${form}.jsx'

export default function ${kind}() {
  return (
    <section className="auth-page">
      <${form} />
    </section>
  )
}
`
}

function sampleDataFile(spec) {
  const f = spec.features
  const stats = f.has('scanner')
    ? [
        { label: 'Emails checked', value: '1,284', change: '+12% this week' },
        { label: 'Flagged as risky', value: '37', change: '2.9% of checks' },
        { label: 'Reported by staff', value: '19', change: '+4 this week' },
        { label: 'Training completion', value: '82%', change: '+6 pts' },
      ]
    : [
        { label: 'Active users', value: '248', change: '+18% this month' },
        { label: 'Sessions this week', value: '1,092', change: '+7%' },
        { label: 'Conversion', value: '3.4%', change: '+0.6 pts' },
        { label: 'Open tasks', value: '12', change: '4 due today' },
      ]
  const activity = [
    { id: 1, when: 'Today, 09:12', event: 'New sign-up', detail: 'Trial started' },
    { id: 2, when: 'Today, 08:47', event: f.has('scanner') ? 'Suspicious email flagged' : 'Report exported', detail: f.has('scanner') ? 'Invoice lure blocked' : 'Weekly summary' },
    { id: 3, when: 'Yesterday', event: 'Settings updated', detail: 'Notification preferences' },
    { id: 4, when: 'Yesterday', event: 'Team member invited', detail: 'Pending acceptance' },
  ]
  return `// Sample data for the prototype dashboard. Replace with real data from an API.
export const STATS = ${JSON.stringify(stats, null, 2)}

export const RECENT_ACTIVITY = ${JSON.stringify(activity, null, 2)}
`
}

function statCardFile() {
  return `export default function StatCard({ label, value, change }) {
  return (
    <article className="card stat">
      <p className="muted small">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-change">{change}</p>
    </article>
  )
}
`
}

function dashboardFile(spec, fixes) {
  const auth = spec.features.has('auth')
  const expiry = fixes.has('sessionExpiry')
  return `import StatCard from '../components/StatCard.jsx'
import { RECENT_ACTIVITY, STATS } from '../data/sampleData.js'
${auth ? "import { logout } from '../services/authService.js'\nimport { navigate } from '../router.js'\n" : ''}
export default function Dashboard({ user }) {
${
  auth
    ? `  function handleLogout() {
    logout()
    navigate('/login')
  }

  const firstName = (user?.name || 'there').split(' ')[0]
`
    : ''
}
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>${auth ? "{'Hello, ' + firstName}" : 'Overview'}</h1>
          <p className="muted">Sample numbers for the prototype. Connect real data before launch.</p>
        </div>
${auth ? '        <button type="button" className="button" onClick={handleLogout}>\n          Log out\n        </button>\n' : ''}      </header>

      <div className="stats">
        {STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="panel">
        <h2>Recent activity</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Event</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_ACTIVITY.map((row) => (
                <tr key={row.id}>
                  <td>{row.when}</td>
                  <td>{row.event}</td>
                  <td className="muted">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
${
  auth
    ? `
      <div className="panel">
        <h2>Your account</h2>
        <dl className="details">
          <dt>Email</dt>
          <dd>{user?.email}</dd>
          <dt>Role</dt>
          <dd>{user?.role}</dd>
${expiry ? "          <dt>Session expires</dt>\n          <dd>{user?.expiresAt ? new Date(user.expiresAt).toLocaleTimeString() : '—'}</dd>\n" : ''}        </dl>
      </div>
`
    : ''
}    </section>
  )
}
`
}

function adminFile(spec) {
  const auth = spec.features.has('auth')
  return `${auth ? "import { listUsers } from '../services/authService.js'" : "const SAMPLE_USERS = [\n  { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', role: 'admin', createdAt: '2026-01-12T10:00:00Z' },\n  { id: 'u2', name: 'Sam Lee', email: 'sam@example.com', role: 'member', createdAt: '2026-02-03T15:30:00Z' },\n  { id: 'u3', name: 'Jordan Kim', email: 'jordan@example.com', role: 'member', createdAt: '2026-03-18T09:10:00Z' },\n]"}

export default function Admin() {
  const users = ${auth ? 'listUsers()' : 'SAMPLE_USERS'}
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>People</h1>
          <p className="muted">${auth ? 'Accounts registered in this browser. Password data is never shown.' : 'Sample users for the prototype.'}</p>
        </div>
      </header>
      <div className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge">{user.role}</span>
                  </td>
                  <td className="muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <p className="muted">No accounts yet.</p>}
      </div>
    </section>
  )
}
`
}

// ----- Security tool -----

function heuristicsFile(fixes) {
  return `// Heuristic phishing signals. This is a teaching aid, not a guarantee:
// it can miss phishing emails and flag safe ones.
const SIGNALS = [
  { id: 'urgency', label: 'Urgent or threatening language', weight: 2, pattern: /\\b(urgent|immediately|within 24 hours|suspended|locked|final notice|act now)\\b/gi },
  { id: 'credentials', label: 'Asks for passwords or login details', weight: 3, pattern: /\\b(verify your (account|password|identity)|confirm your password|login details|reset your password)\\b/gi },
  { id: 'money', label: 'Payment, gift card or wire transfer request', weight: 3, pattern: /\\b(gift cards?|wire transfer|bank details|payment overdue|overdue invoice|bitcoin)\\b/gi },
  { id: 'links', label: 'Links to raw IP addresses or look-alike domains', weight: 3, pattern: /https?:\\/\\/(\\d{1,3}(\\.\\d{1,3}){3}|[^\\s/]*(-secure|-login|-verify|paypa1|micros0ft|g00gle)[^\\s/]*)\\S*/gi },
  { id: 'generic', label: 'Generic greeting', weight: 1, pattern: /\\b(dear (customer|user|client)|valued customer)\\b/gi },
  { id: 'attachment', label: 'Risky attachment or macro request', weight: 2, pattern: /\\.(zip|exe|scr|docm|xlsm)\\b|enable (macros|content)/gi },
]

export const SAMPLE_EMAIL = 'Dear customer,\\n\\nYour account will be suspended within 24 hours. Verify your password immediately at http://192.168.4.20/secure-login to avoid losing access.\\n\\nPayment overdue: please send the attached invoice.zip details today.\\n\\nSupport Team'

export function analyzeEmail(text) {
  const matches = SIGNALS.map((signal) => {
    const found = text.match(signal.pattern) || []
    return { id: signal.id, label: signal.label, count: found.length, weight: signal.weight, examples: [...new Set(found)].slice(0, 3) }
  }).filter((m) => m.count > 0)
  const score = matches.reduce((sum, m) => sum + m.weight * Math.min(m.count, 2), 0)
  const level = score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low'
  return { score, level, matches }
}

// Split the text into plain and flagged parts, for highlighting.
export function toSegments(text) {
  const ranges = []
  SIGNALS.forEach((signal) => {
    for (const match of text.matchAll(signal.pattern)) ranges.push([match.index, match.index + match[0].length])
  })
  ranges.sort((a, b) => a[0] - b[0])
  const segments = []
  let cursor = 0
  ranges.forEach(([start, end]) => {
    if (start < cursor) return
    if (start > cursor) segments.push({ text: text.slice(cursor, start), flagged: false })
    segments.push({ text: text.slice(start, end), flagged: true })
    cursor = end
  })
  if (cursor < text.length) segments.push({ text: text.slice(cursor), flagged: false })
  return segments
}
${
  fixes.has('safeRendering')
    ? ''
    : `
// Build highlighted HTML for the preview.
export function highlightHtml(text) {
  return toSegments(text)
    .map((segment) => (segment.flagged ? '<mark>' + segment.text + '</mark>' : segment.text))
    .join('')
}
`
}`
}

function scannerPageFile(fixes) {
  const safe = fixes.has('safeRendering')
  return `import { useState } from 'react'
import { SAMPLE_EMAIL, analyzeEmail, ${safe ? 'toSegments' : 'highlightHtml'} } from '../services/phishingHeuristics.js'

const LEVEL_TEXT = { low: 'Low risk', medium: 'Suspicious', high: 'Likely phishing' }

export default function Scanner() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim()) {
      setError('Paste the text of an email first.')
      setResult(null)
      return
    }
    setError('')
    setResult({ ...analyzeEmail(text), text })
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Email check</p>
          <h1>Is this email suspicious?</h1>
          <p className="muted">Paste the email text. Nothing is uploaded: the check runs in your browser.</p>
        </div>
      </header>

      <form className="panel form wide" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email text</span>
          <textarea className="email-input" value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} placeholder="Paste the full email here…" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="button primary">
            Check email
          </button>
          <button type="button" className="button" onClick={() => setText(SAMPLE_EMAIL)}>
            Use a sample phishing email
          </button>
        </div>
      </form>

      {result && (
        <div className="panel result" aria-live="polite">
          <div className="result-head">
            <span className={'badge ' + result.level}>{LEVEL_TEXT[result.level]}</span>
            <span className="muted small">Score {result.score}</span>
          </div>
          {result.matches.length === 0 ? (
            <p>No common warning signs found. Stay careful: this check cannot catch everything.</p>
          ) : (
            <ul className="signals">
              {result.matches.map((match) => (
                <li key={match.id}>
                  <strong>{match.label}</strong>
                  <span className="muted small"> · {match.examples.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
          <h3>Highlighted email</h3>
${
  safe
    ? `          <div className="email-preview">
            {toSegments(result.text).map((segment, index) =>
              segment.flagged ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
            )}
          </div>`
    : `          <div className="email-preview" dangerouslySetInnerHTML={{ __html: highlightHtml(result.text) }} />`
}
          <p className="notice">Heuristic check only. When in doubt, contact the sender through a known phone number, never through the email itself.</p>
        </div>
      )}
    </section>
  )
}
`
}

// ----- API frontend -----

function apiClientFile(fixes) {
  const safe = fixes.has('noHardcodedKey')
  return `${
    safe
      ? `// Public, read-only demo API. Secret keys never belong in frontend code: if an API needs a key,
// call it through your own server so the key never reaches the browser.
const API_BASE = 'https://jsonplaceholder.typicode.com'
`
      : `const API_BASE = 'https://jsonplaceholder.typicode.com'
const API_KEY = 'demo-key-4f9a8c2e1b7d6a3f'
`
  }
export const RESOURCES = ['posts', 'users', 'todos']

export async function getResource(resource) {
  if (!RESOURCES.includes(resource)) throw new Error('Unknown resource.')
  const response = await fetch(API_BASE + '/' + resource + '?_limit=5', {
${safe ? '    signal: AbortSignal.timeout(8000),\n' : "    headers: { 'X-Api-Key': API_KEY },\n"}  })
  if (!response.ok) throw new Error('The API answered with status ' + response.status + '.')
  return response.json()
}
`
}

function apiExplorerFile() {
  return `import { useState } from 'react'
import { RESOURCES, getResource } from '../services/apiClient.js'

export default function ApiExplorer() {
  const [resource, setResource] = useState(RESOURCES[0])
  const [state, setState] = useState({ loading: false, error: '', data: null })

  async function load(name) {
    setResource(name)
    setState({ loading: true, error: '', data: null })
    try {
      const data = await getResource(name)
      setState({ loading: false, error: '', data })
    } catch (err) {
      setState({ loading: false, error: err.name === 'TimeoutError' ? 'The API took too long to answer.' : err.message || 'Could not reach the API.', data: null })
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">API explorer</p>
          <h1>Browse live data</h1>
          <p className="muted">Reads from a public demo API. No keys or personal data are sent.</p>
        </div>
      </header>
      <div className="actions">
        {RESOURCES.map((name) => (
          <button key={name} type="button" className={'button' + (resource === name ? ' primary' : '')} onClick={() => load(name)} disabled={state.loading}>
            {name}
          </button>
        ))}
      </div>
      <div className="panel" aria-live="polite">
        {state.loading && <p className="muted">Loading {resource}…</p>}
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.data && <pre className="json">{JSON.stringify(state.data, null, 2)}</pre>}
        {!state.loading && !state.error && !state.data && <p className="muted">Choose a resource to load it.</p>}
      </div>
    </section>
  )
}
`
}

// ----- Portfolio -----

function portfolioDataFile(fixes) {
  const scheme = fixes.has('httpsOnly') ? 'https' : 'https'
  return `export const PROJECTS = [
  { title: 'Phishing awareness game', text: 'A short browser game that teaches staff to spot fake login pages.', tags: ['React', 'Security'], url: '${scheme}://example.com/phishing-game' },
  { title: 'Budget planner', text: 'Monthly budgeting tool with charts and CSV export.', tags: ['JavaScript', 'Data'], url: '${scheme}://example.com/budget-planner' },
  { title: 'Community website', text: 'Events and volunteer sign-ups for a local nonprofit.', tags: ['Design', 'Accessibility'], url: '${scheme}://example.com/community' },
]

export const SKILLS = ['React', 'JavaScript', 'UI design', 'Accessibility', 'Security basics', 'Technical writing']
`
}

function projectCardFile(fixes) {
  const rel = fixes.has('safeExternalLinks') ? ' rel="noopener noreferrer"' : ''
  return `export default function ProjectCard({ project }) {
  return (
    <article className="card">
      <h3>{project.title}</h3>
      <p className="muted">{project.text}</p>
      <p className="tags">
        {project.tags.map((tag) => (
          <span key={tag} className="badge">
            {tag}
          </span>
        ))}
      </p>
      <a href={project.url} target="_blank"${rel}>
        View project
      </a>
    </article>
  )
}
`
}

function portfolioPageFile(spec) {
  return `import ProjectCard from '../components/ProjectCard.jsx'
import { PROJECTS, SKILLS } from '../data/projects.js'
${spec.features.has('contact') ? "import Link from '../components/Link.jsx'\n" : ''}
export default function Portfolio() {
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Selected work</p>
          <h1>Projects</h1>
          <p className="muted">Placeholder projects. Replace them with your own work.</p>
        </div>
      </header>
      <div className="grid">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
      <div className="section">
        <h2>Skills</h2>
        <p className="tags">
          {SKILLS.map((skill) => (
            <span key={skill} className="badge">
              {skill}
            </span>
          ))}
        </p>
      </div>
      <div className="section panel">
        <h2>Work together</h2>
        <p className="muted">Available for freelance projects.</p>
        ${spec.features.has('contact') ? '<Link to="/contact" className="button primary">\n          Get in touch\n        </Link>' : '<a className="button primary" href="mailto:hello@example.com">\n          Email me\n        </a>'}
      </div>
    </section>
  )
}
`
}

// ----- Contact -----

function contactFormFile() {
  return `import { useState } from 'react'

const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState({ type: '', message: '' })
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setStatus({ type: 'error', message: 'Enter your name.' })
    if (!EMAIL_PATTERN.test(form.email.trim())) return setStatus({ type: 'error', message: 'Enter a valid email address.' })
    if (form.message.trim().length < 10) return setStatus({ type: 'error', message: 'Write a message of at least 10 characters.' })
    // Prototype: nothing is sent. Connect an email service or backend before launch.
    setForm({ name: '', email: '', message: '' })
    setStatus({ type: 'success', message: 'Thanks! In this prototype the message is not sent anywhere yet.' })
  }

  return (
    <form className="card form wide" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Name</span>
        <input type="text" autoComplete="name" value={form.name} maxLength={80} onChange={update('name')} />
      </label>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={form.email} maxLength={254} onChange={update('email')} />
      </label>
      <label className="field">
        <span>Message</span>
        <textarea rows={5} value={form.message} maxLength={2000} onChange={update('message')} />
      </label>
      {status.message && (
        <p className={status.type === 'error' ? 'form-error' : 'form-success'} role={status.type === 'error' ? 'alert' : 'status'}>
          {status.message}
        </p>
      )}
      <button type="submit" className="button primary">
        Send message
      </button>
    </form>
  )
}
`
}

function contactPageFile() {
  return `import ContactForm from '../components/ContactForm.jsx'

export default function Contact() {
  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Contact</p>
          <h1>Get in touch</h1>
          <p className="muted">We usually reply within two working days.</p>
        </div>
      </header>
      <ContactForm />
    </section>
  )
}
`
}

// ----- Styles & docs -----

function stylesFile(spec) {
  const accent = PALETTES[[...spec.slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % PALETTES.length]
  return `:root {
  --accent: ${accent};
  --accent-soft: color-mix(in srgb, var(--accent) 12%, white);
  --bg: #f6f6fa;
  --surface: #ffffff;
  --text: #16161d;
  --muted: #5d5d6e;
  --line: #e3e3ec;
  --danger: #b42318;
  --ok: #15803d;
  --radius: 14px;
  color-scheme: light;
}

body { background: var(--bg); color: var(--text); }
a { color: var(--accent); }
h1, h2, h3 { letter-spacing: -0.01em; }

.app { min-height: 100vh; display: flex; flex-direction: column; }

.navbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 12px clamp(16px, 4vw, 40px);
  background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; color: var(--text); text-decoration: none; }
.brand-mark { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--accent); color: #fff; font-size: 0.8rem; }
.nav-links { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.nav-link { padding: 8px 12px; border-radius: 8px; color: var(--muted); font-weight: 500; text-decoration: none; }
.nav-link:hover, .nav-link.active { color: var(--text); background: var(--accent-soft); }

.main { flex: 1; width: 100%; max-width: 1080px; margin: 0 auto; padding: clamp(24px, 5vw, 56px) clamp(16px, 4vw, 40px); }

.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px; border: 1px solid var(--line); border-radius: 10px;
  background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer;
}
.button:hover { border-color: var(--accent); }
.button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.button.primary:hover { filter: brightness(1.08); }
.button:disabled { opacity: 0.55; cursor: not-allowed; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }

.hero { max-width: 720px; padding: clamp(24px, 6vw, 72px) 0 clamp(16px, 4vw, 40px); }
.hero h1 { margin: 0 0 16px; font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1.05; }
.hero p { margin: 0 0 28px; font-size: 1.15rem; color: var(--muted); }
.eyebrow { margin: 0 0 10px; color: var(--accent); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }

.section { margin-top: 56px; }
.section h2 { margin: 0 0 18px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
.card, .panel { padding: 24px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); }
.panel { margin-bottom: 20px; }
.panel h2 { margin-top: 0; font-size: 1.2rem; }
.card h3 { margin: 0 0 6px; }
.muted { color: var(--muted); }
.small { font-size: 0.875rem; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }

.auth-page { display: grid; place-items: center; padding: 12px 0; }
.form { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 440px; }
.form.wide { max-width: none; }
.form h1 { margin: 0; font-size: 1.8rem; }
.form p { margin: 0; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 0.92rem; font-weight: 600; }
.field input, .field textarea { padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--text); font: inherit; font-weight: 400; }
.field input:focus, .field textarea:focus { outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent); border-color: var(--accent); }
.check { display: flex; align-items: flex-start; gap: 10px; color: var(--muted); font-size: 0.9rem; }
.check input { margin-top: 4px; }
.form-error { margin: 0; padding: 10px 12px; border: 1px solid #fecdca; border-radius: 10px; background: #fef3f2; color: var(--danger); }
.form-success { margin: 0; padding: 10px 12px; border: 1px solid #bbf7d0; border-radius: 10px; background: #f0fdf4; color: var(--ok); }

.strength-bar { height: 6px; overflow: hidden; border-radius: 99px; background: var(--line); }
.strength-fill { display: block; height: 100%; background: var(--danger); transition: width 0.3s; }
.strength-fill.level-3 { background: #ca8a04; }
.strength-fill.level-4 { background: #65a30d; }
.strength-fill.level-5 { background: var(--ok); }
.strength-label { margin: 6px 0 4px; font-size: 0.85rem; font-weight: 600; }
.strength-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 0.82rem; }
.strength-checks .ok { color: var(--ok); }

.page-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.page-head h1 { margin: 0; font-size: 2.1rem; }
.page-head p { margin: 6px 0 0; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 20px; }
.stat p { margin: 0; }
.stat-value { margin: 4px 0; font-size: 1.9rem; font-weight: 700; }
.stat-change { color: var(--ok); font-size: 0.85rem; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 0.93rem; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid var(--line); text-align: left; }
.table th { color: var(--muted); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.details { display: grid; grid-template-columns: max-content 1fr; gap: 8px 20px; margin: 0; }
.details dt { color: var(--muted); }
.details dd { margin: 0; }

.badge { display: inline-block; padding: 2px 10px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); font-size: 0.78rem; font-weight: 700; }
.badge.high { background: #fee4e2; color: #b42318; }
.badge.medium { background: #fef0c7; color: #b54708; }
.badge.low { background: #dcfae6; color: #067647; }
.result-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.signals { padding-left: 18px; }
.email-input { min-height: 200px; resize: vertical; }
.email-preview { padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: #fafafa; font-family: ui-monospace, Consolas, monospace; font-size: 0.85rem; white-space: pre-wrap; overflow-wrap: anywhere; }
mark { padding: 0 2px; border-radius: 3px; background: #fde68a; }
pre.json { max-height: 420px; margin: 0; padding: 16px; overflow: auto; border-radius: 10px; background: #0f172a; color: #e2e8f0; font-size: 0.82rem; }
.notice { margin-top: 16px; padding: 8px 14px; border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; background: var(--accent-soft); color: var(--muted); font-size: 0.9rem; }

.empty { padding: 60px 0; text-align: center; }
.footer { padding: 20px clamp(16px, 4vw, 40px); border-top: 1px solid var(--line); color: var(--muted); font-size: 0.85rem; text-align: center; }

@media (max-width: 640px) {
  .page-head h1 { font-size: 1.7rem; }
  .strength-checks { grid-template-columns: 1fr; }
}
`
}

function readmeFile(spec, fixes) {
  const pages = planPages(spec.features)
  const f = spec.features
  const security = [
    f.has('auth') && (fixes.has('hashPasswords') ? '- Passwords are stored as salted PBKDF2 hashes, never in plain text.' : '- Passwords are currently stored in plain text (prototype draft).'),
    f.has('auth') && fixes.has('genericErrors') && '- Failed logins return one generic message, so accounts cannot be discovered.',
    f.has('auth') && fixes.has('sessionExpiry') && '- Sessions expire after 30 minutes.',
    f.has('scanner') && fixes.has('safeRendering') && '- Pasted email text is always rendered as escaped text (no raw HTML).',
    f.has('api') && fixes.has('noHardcodedKey') && '- No API keys are stored in frontend code.',
  ].filter(Boolean)

  return `# ${spec.name}

Generated by the **AI Startup Team** in Build mode.

> Task: ${spec.task}

## Run it

\`\`\`bash
npm install
npm run dev      # development server
npm run build    # production build into dist/
npm run preview  # serve the production build
\`\`\`

## Pages

${pages.map((p) => `- \`#${p.route}\` — ${p.title}${p.requiresAuth ? ' (requires login)' : ''}`).join('\n')}

## Structure

- \`src/App.jsx\` — routes and layout
- \`src/router.js\` — tiny hash router (no extra dependency)
- \`src/pages/\` — one file per page
- \`src/components/\` — reusable UI
- \`src/services/\` — logic (${f.has('auth') ? 'accounts, password rules' : 'data helpers'})
- \`src/styles/app.css\` — all styles

## Security notes

${security.length ? security.join('\n') + '\n' : ''}- This is a **prototype**. ${f.has('auth') ? 'Accounts live in the browser (localStorage), so this is not production authentication. ' : ''}Before real customers use it, add a server, a privacy policy, and a professional security review.

## Not done automatically

The AI team does not deploy, buy services, or connect real accounts. Those steps need the founder's approval.
`
}

// ---------- Entry points ----------

// Build every file of the application for this spec and set of applied fixes.
export function generateProjectFiles(spec, fixes = new Set(), brief = {}) {
  const f = spec.features
  const s = { ...spec, slug: slugify(spec.name) }
  const files = [
    { path: 'src/App.jsx', content: appFile(s, fixes) },
    { path: 'src/router.js', content: routerFile() },
    { path: 'src/components/Link.jsx', content: linkFile() },
    { path: 'src/components/Navbar.jsx', content: navbarFile(s) },
    { path: 'src/components/Footer.jsx', content: footerFile(s) },
    { path: 'src/components/FeatureGrid.jsx', content: featureGridFile() },
    { path: 'src/pages/Home.jsx', content: homeFile(s, brief) },
    { path: 'src/styles/app.css', content: stylesFile(s) },
    { path: 'README.md', content: readmeFile(s, fixes) },
  ]
  if (f.has('waitlist')) files.push({ path: 'src/components/WaitlistForm.jsx', content: waitlistFile(s) })
  if (f.has('auth')) {
    files.push(
      { path: 'src/services/authService.js', content: authServiceFile(s, fixes) },
      { path: 'src/services/passwordRules.js', content: passwordRulesFile(fixes) },
      { path: 'src/hooks/useAuth.js', content: authHookFile() },
      { path: 'src/components/LoginForm.jsx', content: loginFormFile() },
      { path: 'src/components/RegisterForm.jsx', content: registerFormFile() },
      { path: 'src/components/PasswordStrength.jsx', content: passwordStrengthFile() },
      { path: 'src/pages/Login.jsx', content: authPageFile('Login') },
      { path: 'src/pages/Register.jsx', content: authPageFile('Register') },
    )
    if (fixes.has('hashPasswords')) files.push({ path: 'src/services/passwordHash.js', content: passwordHashFile() })
  }
  if (f.has('dashboard')) {
    files.push(
      { path: 'src/pages/Dashboard.jsx', content: dashboardFile(s, fixes) },
      { path: 'src/components/StatCard.jsx', content: statCardFile() },
      { path: 'src/data/sampleData.js', content: sampleDataFile(s) },
    )
  }
  if (f.has('admin')) files.push({ path: 'src/pages/Admin.jsx', content: adminFile(s) })
  if (f.has('scanner')) {
    files.push({ path: 'src/services/phishingHeuristics.js', content: heuristicsFile(fixes) }, { path: 'src/pages/Scanner.jsx', content: scannerPageFile(fixes) })
  }
  if (f.has('api')) files.push({ path: 'src/services/apiClient.js', content: apiClientFile(fixes) }, { path: 'src/pages/ApiExplorer.jsx', content: apiExplorerFile() })
  if (f.has('portfolio')) {
    files.push(
      { path: 'src/data/projects.js', content: portfolioDataFile(fixes) },
      { path: 'src/components/ProjectCard.jsx', content: projectCardFile(fixes) },
      { path: 'src/pages/Portfolio.jsx', content: portfolioPageFile(s) },
    )
  }
  if (f.has('contact')) files.push({ path: 'src/components/ContactForm.jsx', content: contactFormFile() }, { path: 'src/pages/Contact.jsx', content: contactPageFile() })
  return files
}
