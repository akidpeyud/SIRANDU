import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: semua /api diteruskan ke backend Express. Alamat backend diatur lewat VITE_BACKEND_URL di file .env
// (dibaca dengan loadEnv, jadi cukup tulis di .env tanpa perlu set variabel di terminal).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL || 'http://localhost:3001'
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': { target, changeOrigin: true } } },
    preview: { port: 4173, proxy: { '/api': { target, changeOrigin: true } } },
  }
})
