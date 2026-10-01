// Project templates. The server creates the framework files itself, so the AI only
// writes application code. package.json and vite.config.js come from here and are
// never written by the AI (see projectFiles.js).

// The only npm scripts a generated project may have. projectExecutor.js checks them before running.
export const TEMPLATE_SCRIPTS = {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
}

// Same versions as the AI Startup Team app, so npm can reuse its cache.
const DEPENDENCIES = { react: '^19.2.8', 'react-dom': '^19.2.8' }
const DEV_DEPENDENCIES = { '@vitejs/plugin-react': '^6.1.1', vite: '^8.3.0' }

export const TEMPLATES = {
  'react-vite': { id: 'react-vite', label: 'React + Vite', dependencies: Object.keys(DEPENDENCIES) },
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export function reactViteTemplate({ packageName, title }) {
  const pkg = {
    name: packageName,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: TEMPLATE_SCRIPTS,
    dependencies: DEPENDENCIES,
    devDependencies: DEV_DEPENDENCIES,
  }

  return [
    { path: 'package.json', content: JSON.stringify(pkg, null, 2) + '\n' },
    {
      path: 'vite.config.js',
      content: `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build also works when served from a sub-path (/preview/<id>/).
  base: './',
})
`,
    },
    {
      path: 'index.html',
      content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    },
    {
      path: 'src/main.jsx',
      content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
    },
    {
      path: 'src/index.css',
      content: `*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
}
`,
    },
    // Placeholder so the project always has an entry point; the Developer replaces it.
    {
      path: 'src/App.jsx',
      content: `export default function App() {
  return <main>Project scaffold ready.</main>
}
`,
    },
    {
      path: 'public/favicon.svg',
      content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4f46e5"/><path d="M10 16.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
`,
    },
    { path: '.gitignore', content: 'node_modules\ndist\n.ai-team\n' },
  ]
}
