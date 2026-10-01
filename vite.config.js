import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // /api/* goes to the Express backend (npm run server) when VITE_API_URL is not set.
    proxy: { '/api': 'http://localhost:3001' },
    // Generated projects are separate apps: never watch or scan them.
    watch: { ignored: ['**/workspace-projects/**', '**/server/**'] },
  },
  optimizeDeps: { entries: ['index.html'] },
  build: {
    rolldownOptions: {
      // React and motion change rarely: ship them as a separate, cacheable chunk.
      output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] } },
    },
  },
})
