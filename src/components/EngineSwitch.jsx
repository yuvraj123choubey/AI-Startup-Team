import Icon from './Icon'

// Choose where AI answers come from: simulated (always available) or live OpenAI via the backend.
// The backend's AI_MODE sets the default; this switch overrides it for this browser.
export default function EngineSwitch({ engine, backend, onChoose, onRefresh, disabled }) {
  const liveReady = backend.status === 'online' && backend.openaiConfigured

  let note
  if (backend.status === 'checking') note = 'Checking the backend…'
  else if (backend.code === 'static_site') note = 'GitHub Pages demo: Analyze runs in Simulated mode. Build Project and Live AI need the backend, so run the project locally for those (npm run dev:all).'
  else if (backend.status === 'offline') note = 'Backend offline. Analyze still works in Simulated mode; Build Project and Live AI need the backend (npm run server).'
  else if (!backend.openaiConfigured) note = 'Backend connected. No OpenAI key is set, so Live AI is unavailable. Add OPENAI_API_KEY to .env and restart the backend.'
  else note = `Backend connected · OpenAI key configured${backend.model ? ` · ${backend.model}` : ''}. Live AI calls cost money on your OpenAI account.`

  const options = [
    { id: 'mock', label: 'Simulated', hint: 'No API key needed' },
    { id: 'openai', label: 'Live AI', hint: 'OpenAI via the backend', unavailable: !liveReady },
  ]

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
            title={o.unavailable ? 'Live AI needs the backend and an OpenAI API key' : o.hint}
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
      </p>
    </div>
  )
}
