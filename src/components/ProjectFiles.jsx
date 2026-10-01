import { useEffect, useState } from 'react'
import { listFiles, readFile } from '../services/projectService'

const kb = (bytes) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`)

// Read-only file browser for a generated project (node_modules, dist and metadata are hidden).
export default function ProjectFiles({ projectId, version }) {
  const [files, setFiles] = useState(null)
  const [selected, setSelected] = useState('')
  const [content, setContent] = useState({ loading: false, text: '', error: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listFiles(projectId)
      .then((list) => {
        if (cancelled) return
        setFiles(list)
        setError('')
        setSelected((current) => current || list.find((f) => f.path === 'src/App.jsx')?.path || list[0]?.path || '')
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [projectId, version])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    // Defer the loading state so it is not set synchronously inside the effect.
    const start = setTimeout(() => !cancelled && setContent((c) => ({ ...c, loading: true, error: '' })), 0)
    readFile(projectId, selected)
      .then((file) => !cancelled && setContent({ loading: false, text: file.content, error: '' }))
      .catch((err) => !cancelled && setContent({ loading: false, text: '', error: err.message }))
    return () => {
      cancelled = true
      clearTimeout(start)
    }
  }, [projectId, selected, version])

  if (error) return <p className="banner is-error">{error}</p>
  if (!files) return <p className="muted">Loading files…</p>
  if (!files.length) return <p className="muted">No files yet.</p>

  return (
    <div className="file-browser">
      <ul className="file-tree" aria-label="Project files">
        {files.map((f) => (
          <li key={f.path}>
            <button type="button" className={`file-link ${selected === f.path ? 'is-active' : ''}`} onClick={() => setSelected(f.path)} aria-current={selected === f.path ? 'true' : undefined}>
              <span>{f.path}</span>
              <span className="file-size">{kb(f.size)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="file-view">
        <div className="file-view-head">
          <span className="micro">{selected}</span>
          {content.loading && <span className="micro">Loading…</span>}
        </div>
        {content.error ? <p className="banner is-error">{content.error}</p> : <pre className="prompt-box file-code">{content.text}</pre>}
      </div>
    </div>
  )
}
