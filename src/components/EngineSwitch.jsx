import { useState } from 'react'
import { REMOTE_BACKEND } from '../services/apiClient'
import Icon from './Icon'

// Choose where AI answers come from: simulated (always available) or live OpenAI via the backend.
// The backend's AI_MODE sets the default; this switch overrides it for this browser.
// A hosted backend can be protected with a founder access code (needed for Live AI and Build Project).
export default function EngineSwitch({ engine, backend, onChoose, onRefresh, onUnlock, onLock, disabled }) {
  const [code, setCode] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [codeError, setCodeError] = useState('')

  const locked = backend.status === 'online' && backend.accessCodeRequired && !backend.accessGranted
  const liveReady = backend.status === 'online' && backend.openaiConfigured && !locked

  let note
  if (backend.status === 'checking')
    note = REMOTE_BACKEND ? 'Connecting to the backend… Free hosting sleeps when idle, so the first visit can take up to a minute.' : 'Checking the backend…'
  else if (backend.code === 'static_site') note = 'GitHub Pages demo: Analyze runs in Simulated mode. Build Project and Live AI need the backend, so run the project locally for those (npm run dev:all).'
  else if (backend.status === 'offline')
    note = REMOTE_BACKEND
      ? 'The backend is not answering right now. Analyze still works in Simulated mode; Build Project and Live AI will return when it is back.'
      : 'Backend offline. Analyze still works in Simulated mode; Build Project and Live AI need the backend (npm run server).'
  else if (locked) note = 'This backend is protected. Visitors can use Simulated Analyze; the founder unlocks Live AI and Build Project with the access code.'
  else if (!backend.openaiConfigured) note = `Backend connected${backend.accessCodeRequired ? ' and unlocked' : ''}. Build Project works in Simulated mode. No OpenAI key is set on the server, so Live AI is unavailable.`
  else note = `Backend connected${backend.accessCodeRequired ? ' and unlocked' : ''} · OpenAI key configured${backend.model ? ` · ${backend.model}` : ''}. Live AI calls cost money on the OpenAI account.`

  const options = [
    { id: 'mock', label: 'Simulated', hint: 'No API key needed' },
    { id: 'openai', label: 'Live AI', hint: 'OpenAI via the backend', unavailable: !liveReady },
  ]

  async function submitCode(event) {
    event.preventDefault()
    if (!code.trim()) return
    setUnlocking(true)
    setCodeError('')
    const ok = await onUnlock(code)
    setUnlocking(false)
    if (ok) setCode('')
    else setCodeError('That code was not accepted.')
  }

  return (
    <div className="engine">
      <span className="micro" id="engine-label">
        AI engine
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby="engine-label">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={engine === o.id}
            className={`segment ${engine === o.id ? 'is-on' : ''} ${o.unavailable ? 'is-unavailable' : ''}`}
            onClick={() => onChoose(o.id)}
            disabled={disabled || (o.unavailable && engine !== o.id)}
            title={o.unavailable ? 'Live AI needs the backend, an OpenAI key on the server, and (if protected) the access code' : o.hint}
          >
            <span className={`mode-dot ${o.id === 'mock' ? 'is-mock' : o.unavailable ? 'is-error' : 'is-live'}`} />
            {o.label}
          </button>
        ))}
      </div>
      <p className={`engine-note ${backend.status === 'offline' || (engine === 'openai' && !liveReady) ? 'is-warn' : ''}`}>
        {note}
        {backend.status === 'offline' && backend.code !== 'static_site' && (
          <button type="button" className="text-button inline engine-retry" onClick={onRefresh}>
            <Icon name="refresh" size={14} /> Check again
          </button>
        )}
        {backend.status === 'online' && backend.accessCodeRequired && backend.accessGranted && (
          <button type="button" className="text-button inline engine-retry" onClick={onLock}>
            Forget access code
          </button>
        )}
      </p>
      {locked && (
        <form className="access-form" onSubmit={submitCode}>
          <label htmlFor="access-code" className="sr-only">
            Founder access code
          </label>
          <input
            id="access-code"
            type="password"
            autoComplete="current-password"
            placeholder="Founder access code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setCodeError('')
            }}
            disabled={unlocking}
          />
          <button type="submit" className="btn btn-ghost btn-sm" disabled={unlocking || !code.trim()}>
            {unlocking ? 'Checking…' : 'Unlock'}
          </button>
          {codeError && (
            <span className="access-error" role="alert">
              {codeError}
            </span>
          )}
        </form>
      )}
    </div>
  )
}
