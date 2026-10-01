// Validates and normalizes a role's structured response before the UI uses it.
// Real model output can be missing keys, use the wrong types, or be truncated.
// Anything unusable is dropped; if nothing usable is left, an error is thrown
// so the app can show a clear failure instead of a half-empty report.
//
// Shared by the backend (validates OpenAI output) and the browser (guards old saved data).

import { detectConflicts, sanitizePositions } from './conflictDetector.js'

export const PRIORITIES = ['high', 'medium', 'low', 'review']
const ROLE_IDS = ['developer', 'security', 'finance', 'legal', 'operations']

export class InvalidResponseError extends Error {
  constructor(message) {
    super(message)
    this.code = 'invalid_response'
  }
}

const text = (value, max = 800) => {
  if (typeof value === 'string') return value.trim().slice(0, max)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

const textList = (value, maxItems = 12) =>
  (Array.isArray(value) ? value : [])
    .map((item) => text(typeof item === 'object' && item ? item.text ?? item.item ?? item.question ?? '' : item))
    .filter(Boolean)
    .slice(0, maxItems)

const number = (value) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : null
}

export function normalizePriority(value) {
  const p = String(value || '').toLowerCase()
  if (PRIORITIES.includes(p)) return p
  if (p.includes('review') || p.includes('professional')) return 'review'
  if (p.startsWith('h') || p.includes('critical')) return 'high'
  if (p.startsWith('l')) return 'low'
  return 'medium'
}

function sections(value) {
  return (Array.isArray(value) ? value : [])
    .map((s) => ({ title: text(s?.title, 120), items: textList(s?.items, 10) }))
    .filter((s) => s.title && s.items.length)
    .slice(0, 8)
}

function recommendations(value) {
  const seen = new Set()
  return (Array.isArray(value) ? value : [])
    .map((r) => (typeof r === 'string' ? { text: text(r), priority: 'medium' } : { text: text(r?.text), priority: normalizePriority(r?.priority) }))
    .filter((r) => r.text && !seen.has(r.text) && seen.add(r.text))
    .slice(0, 10)
}

function estimates(value) {
  const rows = (Array.isArray(value?.rows) ? value.rows : Array.isArray(value) ? value : [])
    .map((row) => {
      const low = number(row?.low)
      const high = number(row?.high)
      const period = /one|once|setup/i.test(row?.period) ? 'one-time' : /year|annual/i.test(row?.period) ? 'year' : 'month'
      if (!text(row?.item) || low === null || high === null) return null
      return { item: text(row.item, 120), low: Math.min(low, high), high: Math.max(low, high), period, note: text(row?.note, 200) }
    })
    .filter(Boolean)
    .slice(0, 12)
  if (!rows.length) return null
  const monthly = rows.filter((r) => r.period === 'month')
  return {
    rows,
    monthlyLow: Math.round(monthly.reduce((sum, r) => sum + r.low, 0)),
    monthlyHigh: Math.round(monthly.reduce((sum, r) => sum + r.high, 0)),
  }
}

function priorityItems(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      if (typeof item === 'string') return { text: text(item), from: [] }
      const from = (Array.isArray(item?.from) ? item.from : [item?.from]).map((r) => String(r || '').toLowerCase()).filter((r) => ROLE_IDS.includes(r))
      return { text: text(item?.text), from: [...new Set(from)] }
    })
    .filter((item) => item.text)
    .slice(0, 12)
}

// Conflicts the Operations model found in addition to the ones detected from positions.
function extraConflicts(value, detected) {
  const known = new Set(detected.map((c) => c.label.toLowerCase()))
  return (Array.isArray(value) ? value : [])
    .map((c, i) => {
      const sides = (Array.isArray(c?.sides) ? c.sides : [])
        .map((s) => ({
          roleId: String(s?.roleId || '').toLowerCase(),
          statement: text(s?.statement, 300),
          optimizesFor: text(s?.optimizesFor, 80) || 'Its own responsibilities',
        }))
        .filter((s) => ROLE_IDS.includes(s.roleId) && s.statement)
      const roles = [...new Set(sides.map((s) => s.roleId))]
      const label = text(c?.topic, 120)
      if (!label || roles.length < 2 || known.has(label.toLowerCase())) return null
      // Each side gets its own "value" so ConflictView can place roles on opposite sides.
      const valued = sides.map((s, j) => ({ ...s, value: `side-${j}` }))
      return {
        key: `operations-${i}`,
        source: 'operations',
        label,
        why: text(c?.whyItMatters, 400) || 'These roles are optimizing for different goals.',
        stakes: text(c?.whyItMatters, 400),
        question: text(c?.decision, 300),
        roles,
        optimizes: Object.fromEntries(valued.map((s) => [s.roleId, s.optimizesFor])),
        sides: valued,
      }
    })
    .filter(Boolean)
    .slice(0, 4)
}

function roleSummaries(previous) {
  return ['developer', 'security', 'finance', 'legal'].map((roleId) => ({
    roleId,
    summary: previous?.[roleId]?.failed ? 'Did not respond.' : previous?.[roleId]?.summary || 'No report.',
  }))
}

function normalizeOperations(raw, previous) {
  const founderSummary = text(raw.founderSummary || raw.briefing, 1500)
  const summary = text(raw.summary, 400) || founderSummary.split('. ')[0]
  if (!summary && !founderSummary) throw new InvalidResponseError('The Operations response had no summary or founder briefing.')

  const priorities = {
    high: priorityItems(raw.highPriority ?? raw.priorities?.high),
    medium: priorityItems(raw.mediumPriority ?? raw.priorities?.medium),
    low: priorityItems(raw.lowPriority ?? raw.priorities?.low),
    review: priorityItems(raw.professionalReview ?? raw.priorities?.review),
  }
  if (!Object.values(priorities).flat().length) throw new InvalidResponseError('The Operations response contained no prioritized actions.')

  const detected = detectConflicts(previous).map((c) => ({ ...c, source: 'positions' }))
  const conflicts = [...detected, ...extraConflicts(raw.conflicts, detected)]
  // Every unresolved conflict is a founder decision, so it leads the high-priority list.
  conflicts
    .slice()
    .reverse()
    .forEach((c) => priorities.high.unshift({ text: `Decide: ${c.label}`, from: c.roles, isDecision: true }))

  return {
    summary: summary || 'Combined the four reports.',
    briefing: founderSummary || summary,
    founderSummary: founderSummary || summary,
    roleSummaries: roleSummaries(previous),
    priorities,
    highPriority: priorities.high,
    mediumPriority: priorities.medium,
    lowPriority: priorities.low,
    professionalReview: priorities.review,
    conflicts,
    nextSteps: textList(raw.nextSteps, 8).length ? textList(raw.nextSteps, 8) : ['Review the conflicts', 'Record your decision below'],
    sections: [],
    assumptions: textList(raw.assumptions),
    risks: textList(raw.risks),
    recommendations: [],
    positions: {},
  }
}

// Main entry point. Throws InvalidResponseError if the response is unusable.
export function normalizeRoleResponse(roleId, raw, { previous = {} } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InvalidResponseError('The model did not return a JSON object.')
  if (roleId === 'operations') return normalizeOperations(raw, previous)

  const response = {
    summary: text(raw.summary, 600),
    sections: sections(raw.sections),
    recommendations: recommendations(raw.recommendations),
    assumptions: textList(raw.assumptions),
    risks: textList(raw.risks),
    positions: sanitizePositions(raw.positions),
  }
  if (roleId === 'finance') {
    const est = estimates(raw.estimates)
    if (est) response.estimates = est
  }
  if (!response.summary) throw new InvalidResponseError(`The ${roleId} response had no summary.`)
  if (!response.sections.length && !response.recommendations.length) {
    throw new InvalidResponseError(`The ${roleId} response had no sections or recommendations.`)
  }
  return response
}

// Make an older or partial saved response safe to render.
export function safeResponse(response) {
  if (!response || response.failed) return response
  return {
    ...response,
    sections: Array.isArray(response.sections) ? response.sections : [],
    recommendations: Array.isArray(response.recommendations) ? response.recommendations : [],
    assumptions: Array.isArray(response.assumptions) ? response.assumptions : [],
    risks: Array.isArray(response.risks) ? response.risks : [],
    positions: response.positions || {},
  }
}
