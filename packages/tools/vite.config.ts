import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '@flux/core': resolve(__dirname, '../core/dist/esm'),
      '@flux/ui': resolve(__dirname, '../ui/dist')
    }
  },
  server: {
    port: 3001,
    open: true
  }
});
