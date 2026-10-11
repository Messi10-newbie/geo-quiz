import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { Readable } from 'node:stream'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// In production Vercel runs api/*.ts as serverless functions.
// This plugin does the same during `npm run dev`, so /api/ai works locally too.
function localApi(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          const mod = (await server.ssrLoadModule('/api/ai.ts')) as {
            POST: (request: Request) => Promise<Response>
          }
          const request = new Request(`http://localhost${req.url ?? ''}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : (Readable.toWeb(req) as ReadableStream),
            duplex: 'half',
          } as RequestInit)
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end()
            return
          }
          const response = await mod.POST(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          server.config.logger.error(String(err))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Local API crashed — see terminal.' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Make NVIDIA_API_KEY from .env.local visible to the api function (server side only;
  // it has no VITE_ prefix, so it is never bundled into the browser code).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), localApi()],
  }
})
