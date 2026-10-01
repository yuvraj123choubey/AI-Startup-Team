// The single place where Analyze mode "talks to AI".
// Components never call the mock engine or the backend directly; they call runAiTeam().
//
// Two engines:
//   'mock'   Simulated responses generated in the browser. No backend or API key needed.
//   'openai' Each role is sent to the backend (POST /api/ai/role), which calls OpenAI with
//            the role's own system prompt and validates the JSON before returning it.
// If a live request fails, the error is shown. Nothing silently falls back to simulated output.

import { WORKFLOW_ORDER, getRole } from '../data/aiRoles'
import { apiRequest } from './apiClient'
import { detectConflicts } from './conflictDetector'
import { generateMockResponse } from './mockResponses'
import { buildAnalysisPrompt } from './promptBuilder'

export const ENGINES = {
  mock: { id: 'mock', label: 'Simulated', long: 'Simulated AI responses' },
  openai: { id: 'openai', label: 'Live AI', long: 'Live AI (OpenAI via the backend)' },
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Earlier outputs are sent without their prompts to keep requests small.
function compact(previous) {
  return Object.fromEntries(Object.entries(previous).map(([roleId, { prompt: _prompt, ...rest }]) => [roleId, rest]))
}

// Ask one role to work on the task.
async function askRole(roleId, { brief, task, previous, engine }) {
  if (engine === 'openai') {
    const { response } = await apiRequest('/api/ai/role', {
      method: 'POST',
      body: { roleId, brief, task, previous: compact(previous), mode: 'openai' },
      timeoutMs: 150000,
    })
    return { ...response, roleId }
  }
  await sleep(900 + Math.random() * 700) // pretend the model is thinking
  const prompt = buildAnalysisPrompt(roleId, brief, task, previous)
  return { ...generateMockResponse(roleId, { brief, task, previous }), roleId, prompt, engine: 'mock' }
}

// When Operations cannot answer, the founder still gets the four reports and the
// conflicts found by comparing positions. Nothing is invented to fill the gap.
function operationsFallback(previous, error) {
  const conflicts = detectConflicts(previous).map((c) => ({ ...c, source: 'positions' }))
  return {
    roleId: 'operations',
    failed: true,
    error,
    summary: 'The Operations Lead did not finish, so there is no combined founder briefing.',
    conflicts,
    roleSummaries: ['developer', 'security', 'finance', 'legal'].map((roleId) => ({
      roleId,
      summary: previous[roleId]?.failed ? 'Did not respond.' : previous[roleId]?.summary || 'No report.',
    })),
    priorities: { high: [], medium: [], low: [], review: [] },
    nextSteps: [],
  }
}

// Send the task through all five roles in order. Each role receives the relevant earlier outputs.
// A failure that will repeat for every role (missing key, backend down, bad key) stops the run.
// A one-off failure (timeout, invalid reply) marks that role as failed and the team continues.
export async function runAiTeam({ brief, task, engine = 'mock', onStepStart, onStepDone, onStepFailed }) {
  const responses = {}
  for (const roleId of WORKFLOW_ORDER) {
    onStepStart?.(roleId)
    try {
      responses[roleId] = await askRole(roleId, { brief, task, previous: { ...responses }, engine })
      onStepDone?.(roleId, responses[roleId])
    } catch (err) {
      if (err.fatal) throw err
      const message = err.message || 'Unknown error'
      responses[roleId] =
        roleId === 'operations'
          ? operationsFallback(responses, message)
          : { roleId, failed: true, error: message, code: err.code, summary: `${getRole(roleId).name} did not respond.` }
      onStepFailed?.(roleId, err)
    }
  }
  return {
    id: Date.now(),
    task,
    brief: { ...brief },
    engine,
    model: responses.developer?.model || null,
    createdAt: new Date().toISOString(),
    topic: responses.developer?.topic || null,
    failedRoles: WORKFLOW_ORDER.filter((id) => responses[id]?.failed),
    responses,
  }
}
