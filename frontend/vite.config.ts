import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/static/_app/' : '/',
  build: {
    outDir: '../backend/static/_app',
    emptyOutDir: true
  }
})
