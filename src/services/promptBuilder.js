// Builds the exact prompt each role receives in Analyze mode.
// Shared by the browser (Simulated mode shows it in the UI) and the backend (sent to OpenAI).
// Uses explicit .js imports so Node can load it too.

import { getRole } from '../data/aiRoles.js'
import { describeTopicsForPrompt, detectConflicts } from './conflictDetector.js'

// Which earlier outputs each role receives. Roles do not work in isolation,
// but each only gets the context that is relevant to its job.
export const CONTEXT_FROM = {
  developer: [],
  security: ['developer'],
  finance: ['developer'],
  legal: ['developer', 'security'],
  operations: ['developer', 'security', 'finance', 'legal'],
}

// Turn the Company Brief into plain text that every role receives.
export function formatBrief(brief = {}) {
  return [
    `Startup name: ${brief.name || '(not provided)'}`,
    `Product: ${brief.product || '(not provided)'}`,
    `Target customer: ${brief.customer || '(not provided)'}`,
    `Problem: ${brief.problem || '(not provided)'}`,
    `Budget: ${brief.budget || '(not provided)'}`,
    `Team size: ${brief.teamSize || '(not provided)'}`,
    `Initial market: ${brief.market || '(not provided)'}`,
    `Product stage: ${brief.stage || '(not provided)'}`,
    `Goals:\n${brief.goals || '(not provided)'}`,
    `Constraints:\n${brief.constraints || '(not provided)'}`,
  ].join('\n')
}

// A compact text version of one role's structured output, passed to later roles.
export function formatRoleOutput(roleId, response) {
  const role = getRole(roleId)
  const lines = [`--- ${role.name} ---`]
  if (!response || response.failed) {
    lines.push(`(This role did not respond${response?.error ? `: ${response.error}` : ''}. Do not guess what it would have said.)`)
    return lines.join('\n')
  }
  lines.push(`Summary: ${response.summary}`)
  ;(response.sections || []).forEach((section) => {
    lines.push(`${section.title}:`)
    section.items.forEach((item) => lines.push(`  - ${item}`))
  })
  if (response.estimates?.rows?.length) {
    lines.push(`Estimated monthly cost: $${response.estimates.monthlyLow}–$${response.estimates.monthlyHigh} (estimate)`)
  }
  if (response.recommendations?.length) {
    lines.push('Recommendations:')
    response.recommendations.forEach((rec) => lines.push(`  - [${rec.priority}] ${rec.text}`))
  }
  if (response.assumptions?.length) lines.push(`Assumptions: ${response.assumptions.join('; ')}`)
  if (response.risks?.length) lines.push(`Risks: ${response.risks.join('; ')}`)
  const positions = Object.entries(response.positions || {})
  if (positions.length) {
    lines.push('Positions:')
    positions.forEach(([key, p]) => lines.push(`  - ${key} = ${p.value}: ${p.statement}`))
  }
  return lines.join('\n')
}

const COMMON_FORMAT = `Respond with ONE JSON object and nothing else (no markdown fences). Use these keys:
{
  "summary": "one or two sentences with your main conclusion",
  "sections": [{ "title": "short heading", "items": ["specific point", "..."] }],
  "recommendations": [{ "text": "a concrete action", "priority": "high" | "medium" | "low" | "review" }],
  "assumptions": ["an assumption the founder should verify"],
  "risks": ["a specific risk"],
  "positions": { "<topicKey>": { "value": "<stance>", "statement": "your stance in one sentence", "optimizesFor": "what you are optimizing for, 2-5 words" } }
}
Use priority "review" for anything that needs a qualified professional (attorney, accountant, security auditor).
Be specific to THIS company and THIS task. 3-6 sections, 3-6 recommendations.
Only include positions on topics where you truly hold a stance for this task. Allowed topics and stances (use these exact keys and values):
${describeTopicsForPrompt()}`

const ROLE_FORMAT = {
  developer: '',
  security: `Your first section must be titled "Findings in the Developer’s plan" and every item in it must start with "HIGH:", "MEDIUM:", or "LOW:".
Include a section titled "Agrees with the Developer" if parts of the plan are sound.`,
  finance: `Also include:
"estimates": { "rows": [{ "item": "cost item", "low": 0, "high": 20, "period": "month" | "one-time" | "year", "note": "assumption behind it" }] }
All numbers are US dollars and are ESTIMATES. Include a "Budget check" section comparing the costs to the budget in the Company Brief.`,
  legal: `Include a section titled "Questions for professional legal review". Phrase findings as questions, never as legal conclusions.
Mark important items with priority "review".`,
}

const OPERATIONS_FORMAT = `Respond with ONE JSON object and nothing else (no markdown fences). Use these keys:
{
  "summary": "one sentence about how you combined the reports",
  "founderSummary": "a 3-5 sentence briefing for the founder: what to do first, what the roles disagree on, what needs a professional",
  "highPriority": [{ "text": "action", "from": ["developer", "security"] }],
  "mediumPriority": [{ "text": "action", "from": ["finance"] }],
  "lowPriority": [{ "text": "action", "from": ["developer"] }],
  "professionalReview": [{ "text": "item a qualified professional should check", "from": ["legal"] }],
  "conflicts": [{ "topic": "short label", "sides": [{ "roleId": "developer", "statement": "their stance", "optimizesFor": "2-5 words" }], "whyItMatters": "one sentence", "decision": "the question the founder must answer" }],
  "nextSteps": ["short next step"],
  "assumptions": ["..."],
  "risks": ["..."]
}
"from" lists the role ids (developer, security, finance, legal) that recommended the action.
In "conflicts" list only ADDITIONAL disagreements that are not already in the detected-conflict list you receive. Never resolve a conflict yourself.`

// Build the exact { system, user } prompt one role receives.
export function buildAnalysisPrompt(roleId, brief, task, previous = {}) {
  const role = getRole(roleId)
  if (!role) throw new Error(`Unknown role: ${roleId}`)

  const format = roleId === 'operations' ? OPERATIONS_FORMAT : [COMMON_FORMAT, ROLE_FORMAT[roleId]].filter(Boolean).join('\n\n')
  const system = `${role.systemPrompt}\n\n${format}`

  const earlier = CONTEXT_FROM[roleId].filter((id) => id in previous).map((id) => formatRoleOutput(id, previous[id]))

  const parts = ['## Company Brief', formatBrief(brief), '## Founder task', task]
  if (earlier.length) parts.push('## Earlier team output', earlier.join('\n\n'))

  if (roleId === 'operations') {
    const detected = detectConflicts(previous)
    parts.push(
      '## Conflicts already detected from the roles’ stated positions',
      detected.length
        ? detected.map((c) => `- ${c.label}: ${c.sides.map((s) => `${s.roleId} → ${s.stance}`).join(' vs ')}`).join('\n')
        : '(none detected)',
    )
  }

  return { system, user: parts.join('\n\n') }
}
