import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/static/_app/',
  build: {
    outDir: '../backend/static/_app',
    emptyOutDir: true
  }
  ,server: {
    proxy: {
      // Proxy /api to local Django backend during development
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  }
})
