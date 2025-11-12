import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const base = mode === 'development' ? '/' : '/static/_app/'
  
  // Use environment variable for API URL, fallback to localhost for development
  const apiUrl = process.env.VITE_API_URL || 'http://127.0.0.1:8000'

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
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
