import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    // Admin screens are lazy-loaded (see App.jsx); keep the remaining warning threshold realistic.
    chunkSizeWarningLimit: 600
  },
  preview: {
    allowedHosts: true, // reachable through a tunnel (ngrok) host name
    // `npm run preview` serves the production build; proxy /api like the dev server does.
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } }
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
