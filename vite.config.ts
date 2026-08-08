import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

// RENOMEIE ao criar um app novo — mantenha em sincronia com src/core/config.ts.
const APP_NAME = 'Fun Backlog'
const APP_DESCRIPTION =
  'Catálogo do seu backlog de jogos, filmes, séries, animes e livros.'
// Escuro: o app está travado no tema escuro (docs/decisions.md, decisão 10).
// É a cor da splash do PWA instalado — clara aqui daria um flash branco a
// cada abertura, antes de o app pintar.
//
// O valor é o fundo JÁ GRANULADO, medido, e não o `--color-bg` puro
// (#131316): é o mesmo motivo do `theme-color` no index.html — a cor chapada
// destoa do conteúdo e vira uma faixa visível. Depende do GRAIN_MODE
// (background → #1a1a1d, overlay → #1e1e21). Mantenha os dois em sincronia.
const THEME_COLOR = '#1e1e21'

// Sha do commit para o rótulo de versão: CI (Vercel/GitHub) fornece por env
// var; local cai no git; sem repo, "dev".
function buildSha(): string {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? ''
  if (fromEnv) return fromEnv.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Exposed to the app (e.g. version shown in the menu for debugging).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Once a new SW activates, take control of open pages and drop stale
        // precaches so updates apply promptly.
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
})
