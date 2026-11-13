import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8004'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      allowedHosts: ['kit-supply-route-trace.trycloudflare.com'],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    detail: 'Backend server is currently unavailable. Please verify the API server is running on port 8004.',
                  })
                )
              }
            })
          },
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
