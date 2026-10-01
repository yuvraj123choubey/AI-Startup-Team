// Automated security checks on a generated project's source files.
// These are simple, explainable pattern rules, not a full security audit. They run in
// both modes: in Simulated mode they ARE the Security Reviewer's code review; with
// live AI they run next to the model's review so obvious problems are never missed.

const RULES = [
  {
    id: 'plaintext-password-storage',
    severity: 'high',
    // A stored record with a "password" property (not passwordHash), in a file that writes to browser storage.
    test: (f) =>
      /localStorage|sessionStorage|indexedDB/.test(f.content) &&
      (/\.push\(\s*\{[^}]*\bpassword\b[^}]*\}\s*\)/.test(f.content) || /^\s*password\s*(,|:\s*password\b)/m.test(f.content) || /setItem\([^)]*\bpassword\b/i.test(f.content)),
    line: /^\s*password\s*(,|:)|\.push\(.*\bpassword\b|setItem\(.*password/,
    issue: 'Passwords are saved in plain text in browser storage. Anyone with access to the browser (or any script on the page) can read every password.',
    recommendation: 'Never store the password itself. Store a salted, slow hash (PBKDF2, bcrypt or Argon2) and compare hashes at login.',
  },
  {
    id: 'account-enumeration',
    severity: 'medium',
    test: (f) => /no account (found|exists)|user not found|account does not exist|email (is )?not (found|registered)/i.test(f.content) && /(incorrect|wrong) password/i.test(f.content),
    line: /no account|user not found|not registered/i,
    issue: 'Login errors say whether an email is registered (“No account found” vs “Incorrect password”). Attackers can use this to discover valid accounts.',
    recommendation: 'Return one generic message for every failed login, for example “Invalid email or password.”',
  },
  {
    id: 'session-no-expiry',
    severity: 'medium',
    test: (f) => /setItem\(\s*(SESSION_KEY|['"`][^'"`]*session)/i.test(f.content) && !/expiresAt|expires_at|maxAge|\bttl\b|SESSION_TTL/i.test(f.content),
    line: /setItem\(\s*(SESSION_KEY|['"`][^'"`]*session)/i,
    issue: 'Sessions never expire. A shared or stolen browser stays signed in forever.',
    recommendation: 'Store an expiry time with the session, reject expired sessions, and clear them on logout.',
  },
  {
    id: 'weak-password-policy',
    severity: 'medium',
    test: (f) => {
      const m = f.content.match(/MIN_PASSWORD_LENGTH\s*=\s*(\d+)/) || f.content.match(/password\.length\s*(?:<|>=)\s*(\d+)/)
      return Boolean(m && Number(m[1]) < 8)
    },
    line: /MIN_PASSWORD_LENGTH|password\.length/,
    issue: 'The minimum password length is below 8 characters.',
    recommendation: 'Require at least 8 characters (12+ is better) and reject very common passwords.',
  },
  {
    id: 'dangerous-html',
    severity: 'high',
    test: (f) => /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write\(/.test(f.content),
    line: /dangerouslySetInnerHTML|innerHTML|insertAdjacentHTML|document\.write/,
    issue: 'User-supplied text is inserted into the page as raw HTML. A crafted input (for example a pasted email) can run scripts in the user’s browser (XSS).',
    recommendation: 'Render user text as React children so it is escaped. Never pass user input to dangerouslySetInnerHTML.',
  },
  {
    id: 'eval-usage',
    severity: 'high',
    test: (f) => /\beval\(|new Function\(/.test(f.content),
    line: /\beval\(|new Function\(/,
    issue: 'Code is executed from a string (eval / new Function).',
    recommendation: 'Remove dynamic code execution; parse data with JSON.parse or explicit logic.',
  },
  {
    id: 'hardcoded-secret',
    severity: 'high',
    test: (f) => /(api[_-]?key|secret|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"`][A-Za-z0-9_-]{12,}['"`]/i.test(f.content) || /\bsk-[A-Za-z0-9]{20,}/.test(f.content),
    line: /(api[_-]?key|secret|token)\s*[:=]|sk-/i,
    issue: 'A secret key is hard-coded in frontend code. Everything in a frontend bundle is public.',
    recommendation: 'Remove the key from the code. Keep secrets on a server and call the API through that server.',
  },
  {
    id: 'password-logged',
    severity: 'medium',
    test: (f) => /console\.(log|info|debug)\([^)]*password/i.test(f.content),
    line: /console\.(log|info|debug)\([^)]*password/i,
    issue: 'A password is written to the browser console.',
    recommendation: 'Never log passwords or tokens.',
  },
  {
    id: 'unsafe-external-link',
    severity: 'low',
    test: (f) => (f.content.match(/<a\b[^>]*target=["']_blank["'][^>]*>/g) || []).some((tag) => !/noopener/.test(tag)),
    line: /target=["']_blank["']/,
    issue: 'Links open in a new tab without rel="noopener noreferrer", so the opened page can control this tab (reverse tabnabbing).',
    recommendation: 'Add rel="noopener noreferrer" to every link with target="_blank".',
  },
  {
    id: 'insecure-http',
    severity: 'low',
    test: (f) => /['"`]http:\/\/(?!localhost|127\.0\.0\.1)[^'"`\s]+['"`]/.test(f.content),
    line: /http:\/\/(?!localhost|127\.0\.0\.1)/,
    issue: 'A URL uses plain http://, so traffic can be read or changed in transit.',
    recommendation: 'Use https:// for every external URL.',
  },
  {
    id: 'client-side-auth',
    severity: 'info',
    test: (f) => /localStorage/.test(f.content) && /export\s+(async\s+)?function\s+(login|register|signIn|signUp)\b/.test(f.content),
    line: /export\s+(async\s+)?function\s+(login|register)/,
    issue: 'Accounts are stored in this browser only (localStorage). That is fine for a prototype demo, but it is not real authentication: there is no server check, and data is lost when the browser is cleared.',
    recommendation: 'Before real customers use it, move accounts to a server (or a managed auth provider) with hashed passwords, HttpOnly session cookies, and rate limiting.',
  },
]

// Rules that need to look at more than one file.
function projectRules(files) {
  const findings = []
  const all = files.map((f) => f.content).join('\n')
  const adminFile = files.find((f) => /['"`]\/admin['"`]/.test(f.content))
  const hasAuth = files.some((f) => /export\s+(async\s+)?function\s+(login|getSession)\b/.test(f.content))
  if (adminFile && hasAuth && !/\bisAdmin\b|role\s*===\s*['"`]admin['"`]/.test(all)) {
    findings.push({
      rule: 'missing-authorization',
      severity: 'medium',
      file: adminFile.path,
      line: lineOf(adminFile.content, /['"`]\/admin['"`]/),
      issue: 'The admin page only checks that someone is signed in, not that they are an administrator. Any registered user can open it.',
      recommendation: 'Check the user’s role before showing admin pages, and show “Access denied” to everyone else.',
    })
  }
  return findings
}

function lineOf(content, pattern) {
  if (!pattern) return null
  const index = content.split('\n').findIndex((line) => pattern.test(line))
  return index >= 0 ? index + 1 : null
}

export function scanFiles(files) {
  const code = files.filter((f) => /\.(jsx?|html)$/.test(f.path))
  const findings = []
  for (const file of code) {
    for (const rule of RULES) {
      if (rule.test(file)) {
        findings.push({ rule: rule.id, severity: rule.severity, file: file.path, line: lineOf(file.content, rule.line), issue: rule.issue, recommendation: rule.recommendation })
      }
    }
  }
  findings.push(...projectRules(code))
  return findings.map((f) => ({ ...f, id: `${f.rule}:${f.file}`, source: 'automated' }))
}

export const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 }
export const isBlocking = (finding) => finding.severity === 'high' || finding.severity === 'medium'
export const isFixable = (finding) => finding.severity !== 'info'
