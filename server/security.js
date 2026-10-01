// Protection for a backend that is reachable from the internet:
//  - an optional founder access code for anything that costs money or runs builds
//  - simple per-IP rate limits so one visitor cannot exhaust the server or the OpenAI budget
import crypto from 'node:crypto'
import { config } from './config.js'

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest()

export function accessGranted(req) {
  if (!config.accessCode) return true
  const given = req.get('x-access-code') || ''
  // Constant-time comparison so the code cannot be guessed character by character.
  return given.length > 0 && crypto.timingSafeEqual(digest(given), digest(config.accessCode))
}

// In-memory sliding-window limiter, keyed by client IP.
export function rateLimit({ windowMs, max, what }) {
  const hits = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      const minutes = Math.ceil((windowMs - (now - recent[0])) / 60000)
      return res.status(429).json({ error: { code: 'rate_limited', message: `Too many ${what}. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`, fatal: true } })
    }
    recent.push(now)
    hits.set(req.ip, recent)
    if (hits.size > 5000) hits.clear() // keep memory bounded
    next()
  }
}

// Wrong codes are limited separately so the access code cannot be brute-forced.
const failedAttempts = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, what: 'wrong access code attempts' })

export function requireAccess(req, res, next) {
  if (accessGranted(req)) return next()
  failedAttempts(req, res, () => {
    const given = Boolean(req.get('x-access-code'))
    res.status(401).json({
      error: {
        code: given ? 'access_denied' : 'access_code_required',
        message: given
          ? 'That access code is not correct.'
          : 'This backend is protected. Enter the founder access code on the New Task page to use Live AI and Build Project.',
        fatal: true,
      },
    })
  })
}
