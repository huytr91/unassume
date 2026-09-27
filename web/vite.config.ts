import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import { handleDeclareApi } from './server/api.ts'

/** Localhost CSP — allow Vite inline HMR hook + Google Fonts used by index.html. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' ws://127.0.0.1:* ws://localhost:* http://127.0.0.1:* http://localhost:* https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function securityHeadersPlugin(): Plugin {
  return {
    name: 'unassume-security-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', CSP)
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Referrer-Policy', 'no-referrer')
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', CSP)
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Referrer-Policy', 'no-referrer')
        next()
      })
    },
  }
}

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
  plugins: [react(), securityHeadersPlugin(), declareApiPlugin()],
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
