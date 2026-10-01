// Analyze mode: one role at a time. The frontend calls this five times, in order,
// passing the earlier roles' outputs so it can show live progress between steps.
import { Router } from 'express'
import { WORKFLOW_ORDER } from '../../src/data/aiRoles.js'
import { buildAnalysisPrompt } from '../../src/services/promptBuilder.js'
import { normalizeRoleResponse, safeResponse } from '../../src/services/responseSchema.js'
import { generateMockResponse } from '../../src/services/mockResponses.js'
import { config } from '../config.js'
import { AppError, sendError } from '../errors.js'
import { requestJson } from '../services/openaiService.js'

const router = Router()

export function resolveMode(requested) {
  if (requested === undefined || requested === null || requested === '') return config.aiMode
  if (requested === 'mock' || requested === 'openai') return requested
  throw new AppError('bad_request', 'mode must be "mock" or "openai".', { status: 400 })
}

const BRIEF_KEYS = ['name', 'product', 'customer', 'problem', 'budget', 'teamSize', 'market', 'stage', 'goals', 'constraints']

function cleanBrief(brief) {
  const out = {}
  BRIEF_KEYS.forEach((key) => {
    out[key] = typeof brief?.[key] === 'string' ? brief[key].slice(0, 2000) : ''
  })
  return out
}

// Only accept earlier outputs from known roles, and make them safe to format.
function cleanPrevious(previous) {
  const out = {}
  WORKFLOW_ORDER.forEach((roleId) => {
    const value = previous?.[roleId]
    if (!value || typeof value !== 'object') return
    out[roleId] = value.failed ? { failed: true, error: String(value.error || '').slice(0, 300) } : safeResponse(value)
  })
  return out
}

router.post('/role', async (req, res) => {
  try {
    const { roleId, task } = req.body || {}
    if (!WORKFLOW_ORDER.includes(roleId)) throw new AppError('bad_request', `Unknown role "${roleId}".`, { status: 400 })
    if (typeof task !== 'string' || !task.trim()) throw new AppError('bad_request', 'The task is empty.', { status: 400 })
    if (task.length > 4000) throw new AppError('bad_request', 'The task is too long (max 4,000 characters).', { status: 400 })

    const mode = resolveMode(req.body.mode)
    const brief = cleanBrief(req.body.brief)
    const previous = cleanPrevious(req.body.previous)
    const prompt = buildAnalysisPrompt(roleId, brief, task.trim(), previous)

    let response
    if (mode === 'mock') {
      response = generateMockResponse(roleId, { brief, task: task.trim(), previous })
    } else {
      const raw = await requestJson({ ...prompt, label: `${roleId} role`, maxTokens: roleId === 'operations' ? 4000 : 3000 })
      response = normalizeRoleResponse(roleId, raw, { previous })
    }
    res.json({ response: { ...response, roleId, prompt, engine: mode, model: mode === 'openai' ? config.openaiModel : null } })
  } catch (err) {
    sendError(res, err)
  }
})

export default router
