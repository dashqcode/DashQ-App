import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/DashQ-App/', // This is crucial for GitHub Pages (repository name)
  build: {
    outDir: '../docs', // Build directly into the docs folder in the root directory
    emptyOutDir: true,
  }
})
