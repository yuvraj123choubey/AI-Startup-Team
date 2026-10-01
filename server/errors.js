// One error type for everything the API reports to the frontend.
// "fatal" means retrying other roles will fail the same way (for example a missing API key),
// so the frontend should stop the workflow and offer Simulated mode instead.

export class AppError extends Error {
  constructor(code, message, { status = 500, fatal = false, details } = {}) {
    super(message)
    this.code = code
    this.status = status
    this.fatal = fatal
    this.details = details
  }
}

export function toErrorBody(err) {
  if (err instanceof AppError) return { code: err.code, message: err.message, fatal: err.fatal }
  if (err?.code === 'invalid_response') return { code: 'invalid_response', message: err.message, fatal: false }
  return { code: 'server_error', message: 'Unexpected server error. Check the backend terminal for details.', fatal: false }
}

export function sendError(res, err) {
  const status = err instanceof AppError ? err.status : err?.code === 'invalid_response' ? 502 : 500
  if (status >= 500 && !(err instanceof AppError)) console.error('[server]', err)
  res.status(status).json({ error: toErrorBody(err) })
}
