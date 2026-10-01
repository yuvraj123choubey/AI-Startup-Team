import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Icon from './Icon'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'brief', label: 'Company Brief' },
  { id: 'team', label: 'AI Team' },
  { id: 'task', label: 'New Task' },
  { id: 'results', label: 'Results' },
  { id: 'projects', label: 'Projects' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'about', label: 'About' },
]

// Five points around a center = five roles around one founder.
function BrandMark() {
  const points = [0, 1, 2, 3, 4].map((i) => {
    const a = (-90 + i * 72) * (Math.PI / 180)
    return [12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8]
  })
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      {points.map(([x, y], i) => (
        <line key={`l${i}`} x1="12" y1="12" x2={x} y2={y} />
      ))}
      {points.map(([x, y], i) => (
        <circle key={`c${i}`} cx={x} cy={y} r="1.9" className={`mark-dot mark-${i}`} />
      ))}
      <circle cx="12" cy="12" r="2.6" className="mark-center" />
    </svg>
  )
}

// What the mode indicator says: which engine is selected, and whether the backend is reachable.
function engineStatus(engine, backend) {
  if (engine === 'openai') {
    if (backend.status === 'offline') return { tone: 'is-error', short: 'Live AI · backend offline', long: 'Live AI selected, but the backend is offline' }
    if (backend.status === 'online' && !backend.openaiConfigured) return { tone: 'is-error', short: 'Live AI · no API key', long: 'Live AI selected, but no OpenAI key is configured' }
    return { tone: 'is-live', short: 'Live AI', long: `Live AI${backend.model ? ` · ${backend.model}` : ''}` }
  }
  return { tone: 'is-mock', short: 'Simulated AI', long: backend.status === 'offline' ? 'Simulated AI responses · backend offline' : 'Simulated AI responses' }
}

export default function Navbar({ page, onNavigate, briefName, running, hasNewResults, engine, backend }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const mode = engineStatus(engine, backend)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [menuOpen])

  function go(id) {
    setMenuOpen(false)
    onNavigate(id)
  }

  const signal = (id) =>
    (id === 'task' && running && <span className="nav-signal is-running" aria-label="running" />) ||
    (id === 'results' && hasNewResults && !running && <span className="nav-signal" aria-label="new results" />)

  return (
    <>
      <header className="topbar">
        <button type="button" className="brand" onClick={() => go('dashboard')}>
          <BrandMark />
          <span className="brand-text">AI Startup Team</span>
        </button>

        <nav className="topnav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`topnav-link ${page === item.id ? 'is-active' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => go(item.id)}
            >
              {page === item.id && <motion.span layoutId="nav-pill" className="topnav-pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span className="topnav-text">{item.label}</span>
              {signal(item.id)}
            </button>
          ))}
        </nav>

        <div className="topbar-meta">
          <span className={`mode-dot ${mode.tone}`} />
          <span title={mode.long}>{mode.short}</span>
          {briefName && <span className="topbar-company">· {briefName}</span>}
        </div>

        <button type="button" className="menu-button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-menu">
          <Icon name="menu" size={18} />
          Menu
          {(running || hasNewResults) && <span className="nav-signal is-running" />}
        </button>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mobile-menu-top">
              <span className="brand">
                <BrandMark />
                <span className="brand-text">AI Startup Team</span>
              </span>
              <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu" autoFocus>
                <Icon name="close" size={20} />
              </button>
            </div>
            <motion.ol className="mobile-links" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } } }}>
              {NAV_ITEMS.map((item) => (
                <motion.li key={item.id} variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0 } }}>
                  <button type="button" className={`mobile-link ${page === item.id ? 'is-active' : ''}`} onClick={() => go(item.id)} aria-current={page === item.id ? 'page' : undefined}>
                    {item.label}
                    {signal(item.id)}
                  </button>
                </motion.li>
              ))}
            </motion.ol>
            <p className="mobile-meta">
              <span className={`mode-dot ${mode.tone}`} /> {mode.long}
              {briefName && ` · ${briefName}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
