import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Version + Commit werden zur Build-Zeit ermittelt und via `define` in die App
// injiziert. Priorität:
//   1. Env-Variablen (im CI/Docker gesetzt: VITE_APP_VERSION = Git-Tag, VITE_GIT_SHA = Commit)
//   2. lokales git (dev)
//   3. package.json / Fallback
function resolveVersion(): string {
  if (process.env.VITE_APP_VERSION) return process.env.VITE_APP_VERSION
  try {
    return execSync('git describe --tags --always', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {}
  try {
    return 'v' + JSON.parse(readFileSync('./package.json', 'utf-8')).version
  } catch {}
  return 'dev'
}

function resolveSha(): string {
  if (process.env.VITE_GIT_SHA) return process.env.VITE_GIT_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {}
  return 'local'
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      manifest: {
        name: 'Macht das Turnier!',
        short_name: 'Macht das Turnier!',
        description: 'Die Helfer- und Planungs-App für das TSV Holm Turnier.',
        theme_color: '#198754',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(resolveVersion()),
    __GIT_SHA__: JSON.stringify(resolveSha()),
  },
  server: { port: 3000, proxy: { '/api': 'http://localhost:5000' } }
})
