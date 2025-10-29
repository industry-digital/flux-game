#!/usr/bin/env tsx

/**
 * Standalone development REPL with auto-restart
 *
 * This bypasses Vite entirely and uses direct file watching
 * to avoid stdin/stdout interference issues.
 */

import chokidar from 'chokidar';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let replProcess: ChildProcess | null = null;
let restartTimeout: NodeJS.Timeout | null = null;

const DEBOUNCE_MS = 300;
const ENTRY_POINT = 'src/repl/cli.ts';
const WATCH_PATTERNS = [
  'src/**/*.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.bench.ts',
];

/**
 * Start the REPL process with full stdio inheritance
 */
function startRepl(): void {
  if (replProcess) {
    console.log('🔄 Restarting REPL...');
    replProcess.kill('SIGTERM');
    replProcess = null;
  } else {
    console.log('🎮 Starting REPL...');
  }

  // Small delay to ensure clean process termination
  setTimeout(() => {
    replProcess = spawn('tsx', [ENTRY_POINT], {
      stdio: 'inherit', // This should work better without Vite interference
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        // Ensure readline works properly
        TERM: process.env.TERM || 'xterm-256color',
      },
    });

    replProcess.on('error', (error) => {
      console.error('🔴 Failed to start REPL:', error.message);
    });

    replProcess.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        console.log(`🔴 REPL exited with code ${code}`);
      }
      replProcess = null;
    });
  }, 100);
}

/**
 * Debounced restart to avoid rapid restarts
 */
function scheduleRestart(): void {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(() => {
    startRepl();
    restartTimeout = null;
  }, DEBOUNCE_MS);
}

/**
 * Setup file watching
 */
function setupWatcher(): void {
  console.log('👀 Watching for changes...');

  const watcher = chokidar.watch(WATCH_PATTERNS, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`📝 Changed: ${relativePath}`);
    scheduleRestart();
  });

  watcher.on('add', (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`➕ Added: ${relativePath}`);
    scheduleRestart();
  });

  watcher.on('unlink', (filePath) => {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`➖ Removed: ${relativePath}`);
    scheduleRestart();
  });

  // Graceful shutdown
  const cleanup = () => {
    console.log('\n🛑 Shutting down...');
    watcher.close();
    if (replProcess) {
      replProcess.kill('SIGTERM');
    }
    if (restartTimeout) {
      clearTimeout(restartTimeout);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * Main entry point
 */
function main(): void {
  console.log('🚀 Starting REPL development server...');
  console.log(`📁 Entry point: ${ENTRY_POINT}`);
  console.log(`👀 Watch patterns: ${WATCH_PATTERNS.join(', ')}`);
  console.log('');

  setupWatcher();
  startRepl();
}

// Check if this file is being run directly
if (require.main === module) {
  main();
}
