import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const TMP_DIR = path.resolve(__dirname, '.tmp')
const SESSION_FILE = path.join(TMP_DIR, 'session.json')
const SAMPLE_USERS_FILE = path.join(TMP_DIR, 'sample_users.json')

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
}

const sessionAndSampleUsersPlugin = {
  name: 'zomato-session-helper',
  configureServer(server) {
    ensureTmp()
    server.middlewares.use((req, res, next) => {
      // GET /__sample_users — list of pre-loaded users with JWTs and cart ids
      if (req.url === '/__sample_users' && req.method === 'GET') {
        try {
          const raw = fs.existsSync(SAMPLE_USERS_FILE)
            ? fs.readFileSync(SAMPLE_USERS_FILE, 'utf8')
            : '{"users":[]}'
          res.setHeader('Content-Type', 'application/json')
          res.end(raw)
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
        return
      }
      // GET /__cart_id?user_id=...
      if (req.url?.startsWith('/__cart_id') && req.method === 'GET') {
        try {
          const url = new URL(req.url, 'http://x')
          const uid = url.searchParams.get('user_id')
          const raw = fs.existsSync(SAMPLE_USERS_FILE)
            ? JSON.parse(fs.readFileSync(SAMPLE_USERS_FILE, 'utf8'))
            : { users: [] }
          const u = (raw.users || []).find((x) => x.id === uid)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ cartId: u?.cartId || null }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
        return
      }
      // /__session — read/write/delete current session
      if (req.url === '/__session') {
        if (req.method === 'GET') {
          const raw = fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, 'utf8') : 'null'
          res.setHeader('Content-Type', 'application/json')
          res.end(raw)
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            try {
              fs.writeFileSync(SESSION_FILE, body || '{}')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: e.message }))
            }
          })
          return
        }
        if (req.method === 'DELETE') {
          try { if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE) } catch {}
          res.end(JSON.stringify({ ok: true }))
          return
        }
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), sessionAndSampleUsersPlugin],
  server: {
    port: 5173,
    proxy: {
      '/graphql': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
