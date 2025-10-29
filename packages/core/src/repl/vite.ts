/**
 * Vite plugin for auto-restarting REPL development
 *
 * Watches TypeScript files and automatically restarts the REPL
 * when changes are detected, providing instant feedback during development.
 */

import { Plugin } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let replProcess: ChildProcess | null = null;
let restartTimeout: NodeJS.Timeout | null = null;

/**
 * Configuration options for the REPL plugin
 */
export interface ReplPluginOptions {
  /**
   * Path to the CLI entry point (relative to project root)
   * @default 'src/repl/cli.ts'
   */
  entryPoint?: string;

  /**
   * Debounce delay in milliseconds to avoid rapid restarts
   * @default 300
   */
  debounceMs?: number;

  /**
   * File patterns to watch for changes
   * @default ['src/**\/*.ts']
   */
  watchPatterns?: string[];

  /**
   * Whether to show verbose logging
   * @default false
   */
  verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<ReplPluginOptions> = {
  entryPoint: 'src/repl/cli.ts',
  debounceMs: 300,
  watchPatterns: ['src/**/*.ts'],
  verbose: false,
};

/**
 * Start the REPL process
 */
function startRepl(entryPoint: string, verbose: boolean): void {
  if (replProcess) {
    if (verbose) {
      console.log('🔄 Stopping existing REPL process...');
    }
    replProcess.kill('SIGTERM');
    replProcess = null;
  }

  if (verbose) {
    console.log('🎮 Starting REPL...');
  } else {
    console.log('🎮 REPL restarted');
  }

  replProcess = spawn('tsx', [entryPoint], {
    stdio: ['inherit', 'inherit', 'inherit'], // Explicitly inherit stdin, stdout, stderr
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' }, // Preserve colors
    detached: false, // Keep attached to parent for proper signal handling
  });

  // Ensure stdin is properly connected
  if (replProcess.stdin && process.stdin.readable) {
    process.stdin.pipe(replProcess.stdin);
  }

  replProcess.on('error', (error) => {
    console.error('🔴 Failed to start REPL:', error.message);
  });

  replProcess.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM') {
      console.log(`🔴 REPL exited with code ${code}`);
    }
    replProcess = null;
  });
}

/**
 * Debounced restart function to avoid rapid restarts
 */
function scheduleRestart(entryPoint: string, debounceMs: number, verbose: boolean): void {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(() => {
    startRepl(entryPoint, verbose);
    restartTimeout = null;
  }, debounceMs);
}

/**
 * Vite plugin for REPL development with auto-restart
 */
export function replPlugin(options: ReplPluginOptions = {}): Plugin {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let isFirstStart = true;

  return {
    name: 'repl-dev',

    // Add watch files during build start
    buildStart() {
      // Watch all specified patterns
      for (const pattern of opts.watchPatterns) {
        this.addWatchFile(pattern);
      }

      if (opts.verbose) {
        console.log(`👀 Watching patterns: ${opts.watchPatterns.join(', ')}`);
      }
    },

    // Handle the initial start
    configResolved() {
      if (isFirstStart) {
        console.log('🚀 Starting REPL development server...');
        startRepl(opts.entryPoint, opts.verbose);
        isFirstStart = false;
      }
    },

    // Handle hot updates (file changes)
    handleHotUpdate({ file, server }) {
      const relativePath = path.relative(process.cwd(), file);

      // Only restart for TypeScript files in our watch patterns
      const shouldRestart = opts.watchPatterns.some(pattern => {
        // Simple glob matching - could be enhanced with a proper glob library
        const regex = new RegExp(
          pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\./g, '\\.')
        );
        return regex.test(relativePath);
      });

      if (shouldRestart) {
        if (opts.verbose) {
          console.log(`🔄 File changed: ${relativePath}`);
        }

        scheduleRestart(opts.entryPoint, opts.debounceMs, opts.verbose);

        // Prevent Vite's default HMR for these files since we're restarting the process
        return [];
      }

      // Let Vite handle other files normally
      return undefined;
    },

    // Cleanup on build end
    buildEnd() {
      if (replProcess) {
        if (opts.verbose) {
          console.log('🛑 Shutting down REPL...');
        }
        replProcess.kill('SIGTERM');
        replProcess = null;
      }

      if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
      }
    },
  };
}

/**
 * Default export for convenience
 */
export default replPlugin;

// Graceful shutdown handling
process.on('SIGINT', () => {
  if (replProcess) {
    replProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (replProcess) {
    replProcess.kill('SIGTERM');
  }
  process.exit(0);
});
