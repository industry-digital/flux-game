# REPL Development

Auto-restarting REPL for Flux Game Engine development.

## Usage

### Standard REPL
```bash
npm run cli
```

### Development REPL (Auto-restart)
```bash
npm run dev:repl
```

The development REPL will automatically restart whenever you change any TypeScript file in the `src/` directory, giving you instant feedback during development.

## Features

- **Auto-restart**: Detects file changes and restarts the REPL automatically
- **Debounced**: Prevents rapid restarts during bulk file changes (300ms delay)
- **Smart watching**: Only watches TypeScript files, excludes tests and benchmarks
- **Graceful shutdown**: Properly cleans up processes on exit
- **Color preservation**: Maintains terminal colors in the restarted REPL

## Configuration

The Vite plugin can be configured in `vite.repl.config.ts`:

```typescript
replPlugin({
  entryPoint: 'src/repl/cli.ts',     // REPL entry point
  debounceMs: 300,                   // Restart delay
  watchPatterns: ['src/**/*.ts'],    // Files to watch
  verbose: false,                    // Detailed logging
})
```

## How it Works

1. **Vite** watches TypeScript files for changes
2. **Custom plugin** detects changes and kills the current REPL process
3. **tsx** spawns a new REPL process with the updated code
4. **Debouncing** prevents rapid restarts during bulk changes

This gives you the best of both worlds: the speed of `tsx` for TypeScript execution and the convenience of automatic restarts during development.
