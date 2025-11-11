import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const base = mode === 'development' ? '/' : '/static/_app/'

  return {
    plugins: [react()],
    base,
    build: {
      outDir: '../backend/static/_app',
      emptyOutDir: true
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
