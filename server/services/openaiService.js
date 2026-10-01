// The only file that talks to OpenAI. The API key is read from the server environment
// and never leaves this process.
import OpenAI from 'openai'
import { config } from '../config.js'
import { AppError } from '../errors.js'

let client = null

export function isOpenAiConfigured() {
  return Boolean(config.openaiKey)
}

function getClient() {
  if (!isOpenAiConfigured()) {
    throw new AppError('missing_api_key', 'Live AI is selected, but OPENAI_API_KEY is not set in the .env file on the server. Add the key and restart the backend, or switch to Simulated mode.', {
      status: 400,
      fatal: true,
    })
  }
  if (!client) client = new OpenAI({ apiKey: config.openaiKey, baseURL: config.openaiBaseUrl, maxRetries: 1 })
  return client
}

// Translate SDK errors into messages a founder can act on.
function mapError(err, label) {
  if (err instanceof AppError) return err
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return new AppError('timeout', `${label}: OpenAI did not answer within ${Math.round(config.openaiTimeoutMs / 1000)} seconds.`, { status: 504 })
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new AppError('openai_unreachable', `${label}: could not reach the OpenAI API. Check the internet connection.`, { status: 502, fatal: true })
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return new AppError('auth_failed', 'OpenAI rejected the API key (401). Check OPENAI_API_KEY in .env and restart the backend.', { status: 401, fatal: true })
  }
  if (err instanceof OpenAI.PermissionDeniedError) {
    return new AppError('permission_denied', `OpenAI denied access to the model "${config.openaiModel}" (403).`, { status: 403, fatal: true })
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new AppError('rate_limited', 'OpenAI rate limit or quota reached (429). Wait a minute, check your billing, or switch to Simulated mode.', { status: 429, fatal: true })
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new AppError('model_unavailable', `The model "${config.openaiModel}" was not found. Set OPENAI_MODEL in .env to a model your key can use.`, { status: 400, fatal: true })
  }
  if (err instanceof OpenAI.BadRequestError) {
    return new AppError('bad_request', `OpenAI rejected the request: ${err.message}`, { status: 400, fatal: true })
  }
  if (err instanceof OpenAI.APIError) {
    return new AppError('upstream_error', `${label}: OpenAI returned an error (${err.status ?? 'unknown'}). Try again.`, { status: 502 })
  }
  return new AppError('upstream_error', `${label}: ${err?.message || 'unknown error'}`, { status: 502 })
}

// Ask the model for one JSON object. Retries once if the reply is not valid JSON.
export async function requestJson({ system, user, label = 'AI request', maxTokens = 4000, timeoutMs = config.openaiTimeoutMs }) {
  const openai = getClient()
  let lastProblem = ''

  for (let attempt = 1; attempt <= 2; attempt++) {
    let completion
    try {
      completion = await openai.chat.completions.create(
        {
          model: config.openaiModel,
          response_format: { type: 'json_object' },
          max_completion_tokens: maxTokens,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: attempt === 1 ? user : `${user}\n\nIMPORTANT: your previous reply was not usable (${lastProblem}). Reply with one complete, valid JSON object only.`,
            },
          ],
        },
        { timeout: timeoutMs },
      )
    } catch (err) {
      throw mapError(err, label)
    }

    const choice = completion.choices?.[0]
    const content = choice?.message?.content
    if (choice?.finish_reason === 'length') {
      lastProblem = 'the reply was cut off because it was too long'
      continue
    }
    if (!content) {
      lastProblem = choice?.message?.refusal ? `the model refused: ${choice.message.refusal}` : 'the reply was empty'
      continue
    }
    try {
      const parsed = JSON.parse(content)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
      lastProblem = 'the reply was not a JSON object'
    } catch {
      lastProblem = 'the reply was not valid JSON'
    }
  }

  throw new AppError('invalid_response', `${label}: the model returned an invalid response twice (${lastProblem}).`, { status: 502 })
}
