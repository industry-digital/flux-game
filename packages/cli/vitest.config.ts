import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    typecheck: {
      tsconfig: './tsconfig.json',
    },
    // Exclude bench files from regular test runs
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.bench.ts'],
  },
  // Vitest bench configuration
  benchmark: {
    include: ['**/*.bench.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
