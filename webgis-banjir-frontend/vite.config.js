import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: semua /api diteruskan ke backend Express (port 3000). Ubah target lewat VITE_BACKEND_URL bila perlu.
const target = process.env.VITE_BACKEND_URL || 'http://localhost:3000'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
  preview: { port: 4173, proxy: { '/api': { target, changeOrigin: true } } },
})
