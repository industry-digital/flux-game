import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  worker: {
    format: 'es'
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@flux': resolve(__dirname, '../core'),
      '@flux/core': resolve(__dirname, '../core'),
      '@flux/ui': resolve(__dirname, '../ui/src'),
    }
  },
  assetsInclude: ['**/*.ttf'],
  optimizeDeps: {
    include: ['@flux/core'],
    force: true
  },
  define: {
    global: 'globalThis',
  }
})
