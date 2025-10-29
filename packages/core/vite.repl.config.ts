/**
 * Vite configuration for REPL development
 *
 * Usage: npm run dev:repl
 */

import { defineConfig } from 'vite';
import { replPlugin } from './src/repl/vite';

export default defineConfig({
  plugins: [
    replPlugin({
      entryPoint: 'src/repl/cli.ts',
      debounceMs: 300,
      watchPatterns: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',  // Exclude test files
        '!src/**/*.bench.ts', // Exclude benchmark files
      ],
      verbose: false, // Set to true for detailed logging
    }),
  ],

  // Vite configuration for the watcher
  build: {
    watch: {
      // Watch additional files that might not be in the dependency graph
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**', 'dist/**', '**/*.spec.ts'],
    },
  },

  // Ensure we're in development mode
  mode: 'development',

  // Disable server since we're just using the file watcher
  server: false,

  // Optimize dependencies for faster restarts
  optimizeDeps: {
    include: ['tsx'],
  },
});
