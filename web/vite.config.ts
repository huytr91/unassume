import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { handleDeclareApi } from './server/api.ts'

function declareApiPlugin(): Plugin {
  return {
    name: 'declare-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          await handleDeclareApi(req, res)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Server error'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), declareApiPlugin()],
  server: {
    host: '127.0.0.1',
    port: 3500,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 3500,
    strictPort: true,
  },
})
