import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadDrivePdfBuffer, parseDrivePdfId, extractTextFromPdfBuffer } from './api/drivePdf.js'
import { createTeacherDriveFolder } from './api/drive-folder.js'

function drivePdfDevPlugin() {
  return {
    name: 'drive-pdf-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      if (env.GOOGLE_DRIVE_API_KEY) process.env.GOOGLE_DRIVE_API_KEY = env.GOOGLE_DRIVE_API_KEY
      if (env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY
      if (env.GOOGLE_OAUTH_CLIENT_ID) process.env.GOOGLE_OAUTH_CLIENT_ID = env.GOOGLE_OAUTH_CLIENT_ID
      if (env.GOOGLE_OAUTH_CLIENT_SECRET) process.env.GOOGLE_OAUTH_CLIENT_SECRET = env.GOOGLE_OAUTH_CLIENT_SECRET
      if (env.GOOGLE_DRIVE_REFRESH_TOKEN) process.env.GOOGLE_DRIVE_REFRESH_TOKEN = env.GOOGLE_DRIVE_REFRESH_TOKEN
      if (env.GOOGLE_DRIVE_PARENT_FOLDER_ID) process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID = env.GOOGLE_DRIVE_PARENT_FOLDER_ID
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url || ''
        if (raw.startsWith('/drive-folder') && req.method === 'POST') {
          const chunks = []
          req.on('data', (c) => chunks.push(c))
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
              const folder = await createTeacherDriveFolder(body.name)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(folder))
            } catch (err) {
              res.statusCode = err.status || 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: String(err.message || 'Drive qovluğu yaranmadı') }))
            }
          })
          return
        }
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
                error: 'Bu PDF skandır və səhifə şəkli oxunmadı. Faylı bağlayıb dərc edə bilərsiniz — şagird Drive PDF görəcək.',
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
