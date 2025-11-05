import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // In development, use root path. In production, use /static/_app/
  const base = mode === 'development' ? '/' : '/static/_app/';
  
  return {
    plugins: [react()],
    base: base,
    build: {
      outDir: '../backend/static/_app',
      emptyOutDir: true
    },
    server: {
      proxy: {
        // Proxy /api to local Django backend during development
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    }
  }
})
