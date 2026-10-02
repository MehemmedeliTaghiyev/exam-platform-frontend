import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadDrivePdfBuffer, parseDrivePdfId } from './api/drivePdf.js'

function drivePdfDevPlugin() {
  return {
    name: 'drive-pdf-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url || ''
        if (!raw.startsWith('/drive-pdf')) {
          next()
          return
        }
        try {
          const id = parseDrivePdfId(new URL(raw, 'http://localhost').searchParams.get('id'))
          const buf = id ? await loadDrivePdfBuffer(id) : null
          if (!buf) {
            res.statusCode = 404
            res.end('pdf yoxdur')
            return
          }
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', 'inline; filename="exam.pdf"')
          res.end(buf)
        } catch {
          res.statusCode = 502
          res.end('pdf yoxdur')
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