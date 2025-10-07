import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/static/_app/',
  build: {
    outDir: '../backend/static/_app',
    emptyOutDir: true
  }
})
