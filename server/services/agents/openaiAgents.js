// Live agents for Build mode (AI_MODE=openai). Each role uses its own buildPrompt from
// src/data/aiRoles.js plus a strict JSON reply format. Replies are validated here;
// file paths are validated again by projectFiles.js before anything is written.
import { getRole } from '../../../src/data/aiRoles.js'
import { formatBrief } from '../../../src/services/promptBuilder.js'
import { AppError } from '../../errors.js'
import { requestJson } from '../openaiService.js'

const text = (v, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v, max = 12) => (Array.isArray(v) ? v.map((x) => text(typeof x === 'string' ? x : x?.text)).filter(Boolean).slice(0, max) : [])
const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.max(0, n) : null
}

function fileBlock(files) {
  return files.map((f) => `=== ${f.path} ===\n${f.content}`).join('\n\n')
}

function projectHeader(project, brief) {
  return ['## Company Brief', formatBrief(brief), '## Project', `Name: ${project.name}`, `Founder task: ${project.task}`].join('\n')
}

const FILE_RULES = `Rules for files:
- Write complete files. Never use placeholders such as "..." or "rest of code here".
- Allowed paths: src/**, public/**, index.html, README.md. Never package.json, vite.config.js or files starting with a dot.
- src/App.jsx must default-export the root component. Do not change src/main.jsx (it imports ./index.css and ./App.jsx).
- Only import "react", "react-dom" and your own files (relative imports with file extensions). No other packages are installed.
- No routing library: if several pages are needed, write a small hash-based router yourself.
- Put styles in .css files imported from JSX.
- Browser-only prototype: there is no backend. If accounts are requested, store them in localStorage with salted
  PBKDF2 password hashes (Web Crypto), generic login errors and session expiry, and say clearly that it is a prototype.
- At most 25 files and roughly 1,800 lines in total. Include README.md with how to run it and its limitations.`

function cleanFiles(files) {
  return (Array.isArray(files) ? files : []).map((f) => ({ path: typeof f?.path === 'string' ? f.path.trim() : f?.path, content: typeof f?.content === 'string' ? f.content : null }))
}

export const openaiAgents = {
  label: 'Live AI',

  async developerBuild({ project, brief }) {
    const role = getRole('developer')
    const raw = await requestJson({
      label: 'Developer',
      maxTokens: 24000,
      timeoutMs: 300_000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{
  "summary": "one or two sentences about what you built",
  "plan": ["short step"],
  "files": [{ "path": "src/App.jsx", "content": "full file content" }],
  "notes": ["anything the founder should know"]
}
${FILE_RULES}`,
      user: `${projectHeader(project, brief)}\n\nBuild this project now.`,
    })
    const files = cleanFiles(raw.files)
    if (!files.length) throw new AppError('invalid_response', 'The Developer returned no files.', { status: 502 })
    return { summary: text(raw.summary) || 'Implementation written.', plan: list(raw.plan), files, notes: list(raw.notes) }
  },

  async developerFix({ project, brief, files, findings, buildError }) {
    const role = getRole('developer')
    const problem = buildError
      ? `## The production build failed\n${buildError.slice(-5000)}`
      : `## Security findings to fix\n${findings.map((f) => `- [${f.id}] ${f.severity.toUpperCase()} in ${f.file}: ${f.issue} Fix: ${f.recommendation}`).join('\n')}`
    const raw = await requestJson({
      label: 'Developer fix',
      maxTokens: 20000,
      timeoutMs: 300_000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{
  "summary": "what you changed",
  "files": [{ "path": "src/...", "content": "the complete new content of each file you changed" }],
  "fixed": ["ids of the findings you fixed"],
  "notes": ["anything you could not fix and why"]
}
Return only files you changed, each with its complete content.
${FILE_RULES}`,
      user: `${projectHeader(project, brief)}\n\n${problem}\n\n## Current source files\n${fileBlock(files)}`,
    })
    return {
      summary: text(raw.summary) || 'Applied fixes.',
      files: cleanFiles(raw.files),
      fixed: list(raw.fixed, 40),
      applied: [],
      notes: list(raw.notes),
    }
  },

  async securityReview({ project, brief, files, automated, openFindings }) {
    const role = getRole('security')
    const raw = await requestJson({
      label: 'Security review',
      maxTokens: 6000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{
  "summary": "one or two sentences",
  "findings": [{ "severity": "high" | "medium" | "low" | "info", "file": "src/...", "issue": "what is wrong", "recommendation": "how to fix it" }],
  "resolved": ["ids of previously reported findings that the current code fixes"]
}
List at most 8 findings. Only report problems that are really in the code shown.`,
      user: [
        projectHeader(project, brief),
        '## Automated checks already reported (do NOT repeat these)',
        automated.length ? automated.map((f) => `- ${f.severity.toUpperCase()} ${f.file}: ${f.issue}`).join('\n') : '(none)',
        '## Your previously reported findings that are still open',
        openFindings.length ? openFindings.map((f) => `- [${f.id}] ${f.severity.toUpperCase()} ${f.file}: ${f.issue}`).join('\n') : '(none — this is the first review)',
        'Put the ids of fixed ones in "resolved". In "findings" list only NEW problems.',
        '## Source files',
        fileBlock(files),
      ].join('\n\n'),
    })
    const findings = (Array.isArray(raw.findings) ? raw.findings : [])
      .map((f) => ({
        severity: ['high', 'medium', 'low', 'info'].includes(String(f?.severity).toLowerCase()) ? String(f.severity).toLowerCase() : 'medium',
        file: text(f?.file, 160) || 'project',
        issue: text(f?.issue, 500),
        recommendation: text(f?.recommendation, 500),
      }))
      .filter((f) => f.issue)
      .slice(0, 8)
    return { summary: text(raw.summary), findings, resolvedIds: list(raw.resolved, 40) }
  },

  async financeReview({ project, brief, files, developer }) {
    const role = getRole('finance')
    const raw = await requestJson({
      label: 'Finance review',
      maxTokens: 3000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{
  "summary": "one or two sentences, including the monthly range and how it compares to the budget",
  "costs": [{ "item": "cost item", "low": 0, "high": 20, "period": "month" | "one-time" | "year", "note": "assumption" }],
  "assumptions": ["..."]
}
3-8 cost items. All numbers are US dollar ESTIMATES.`,
      user: `${projectHeader(project, brief)}\n\n## What the Developer built\n${developer?.summary || ''}\nFiles: ${files.map((f) => f.path).join(', ')}`,
    })
    const costs = (Array.isArray(raw.costs) ? raw.costs : [])
      .map((c) => {
        const low = num(c?.low)
        const high = num(c?.high)
        if (!text(c?.item) || low === null || high === null) return null
        return { item: text(c.item, 120), low: Math.min(low, high), high: Math.max(low, high), period: /one|once/i.test(c?.period) ? 'one-time' : /year|annual/i.test(c?.period) ? 'year' : 'month', note: text(c?.note, 200) }
      })
      .filter(Boolean)
      .slice(0, 10)
    if (!costs.length) throw new AppError('invalid_response', 'Finance returned no cost estimates.', { status: 502 })
    return { summary: text(raw.summary) || `${costs.length} cost considerations (estimates).`, costs, assumptions: list(raw.assumptions) }
  },

  async legalReview({ project, brief, files, developer }) {
    const role = getRole('legal')
    const raw = await requestJson({
      label: 'Legal review',
      maxTokens: 3000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{
  "summary": "one or two sentences",
  "questions": [{ "topic": "short topic", "question": "a question to verify", "professionalReview": true }]
}
3-8 questions. Phrase them as questions, never as legal conclusions.`,
      user: `${projectHeader(project, brief)}\n\n## What the Developer built\n${developer?.summary || ''}\nFiles: ${files.map((f) => f.path).join(', ')}`,
    })
    const questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .map((q) => ({ topic: text(q?.topic, 80) || 'Question', question: text(q?.question, 400), professionalReview: Boolean(q?.professionalReview) }))
      .filter((q) => q.question)
      .slice(0, 10)
    if (!questions.length) throw new AppError('invalid_response', 'Legal returned no questions.', { status: 502 })
    return { summary: text(raw.summary) || `${questions.length} questions to verify.`, questions }
  },

  async operationsReport({ project, brief, outcome, facts }) {
    const role = getRole('operations')
    const raw = await requestJson({
      label: 'Operations report',
      maxTokens: 2000,
      system: `${role.buildPrompt}

Respond with ONE JSON object only:
{ "summary": "3-5 honest sentences for the founder", "nextSteps": ["short next step"] }
The outcome has already been decided by the rules below; describe it, do not change it.`,
      user: `${projectHeader(project, brief)}\n\n## Status\n${JSON.stringify({ outcome, ...facts }, null, 2)}`,
    })
    return { summary: text(raw.summary, 1500), nextSteps: list(raw.nextSteps, 8) }
  },
}
