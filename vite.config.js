import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadDrivePdfBuffer, parseDrivePdfId, extractTextFromPdfBuffer } from './api/drivePdf.js'

function drivePdfDevPlugin() {
  return {
    name: 'drive-pdf-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (env.GOOGLE_DRIVE_API_KEY) process.env.GOOGLE_DRIVE_API_KEY = env.GOOGLE_DRIVE_API_KEY
      if (env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url || ''
        if (!raw.startsWith('/drive-pdf') && !raw.startsWith('/drive-extract')) {
          next()
          return
        }
        try {
          const id = parseDrivePdfId(new URL(raw, 'http://localhost').searchParams.get('id'))
          const buf = id ? await loadDrivePdfBuffer(id) : null
          if (!buf) {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'pdf yoxdur' }))
            return
          }
          if (raw.startsWith('/drive-extract')) {
            const text = String(await extractTextFromPdfBuffer(buf) || '').trim()
            if (text.length < 40) {
              res.statusCode = 422
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                scan: true,
                error: 'Bu PDF skandır (seçilə bilən mətn yoxdur). Kart üçün Exam API-də GPT-4o vision lazımdır. Faylı bağlayıb dərc edə bilərsiniz — şagird Drive PDF görəcək.',
              }))
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ text: text.slice(0, 24000) }))
            return
          }
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', 'inline; filename="exam.pdf"')
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.end(buf)
        } catch (err) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          const detail = String(err?.message || err || 'pdf yoxdur').slice(0, 240)
          res.end(JSON.stringify({ error: detail, detail }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    drivePdfDevPlugin(),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
