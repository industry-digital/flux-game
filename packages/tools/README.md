# @flux/tools

Web-based development tools for the Flux game engine, built with React 19 and TypeScript.

## What It Does

Provides visual tools for testing and debugging game mechanics:

- **Combat Sandbox** - Test 3v3 combat scenarios
- **Actor Management** - Configure shells, weapons, and stats
- **State Visualization** - Watch game state changes in real-time
- **AI Testing** - Automated combat with configurable AI behavior
- **Event Log** - Track all game events and commands

## Running the Tools

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Type check
npm run type-check
```

The development server runs at `http://localhost:5173` by default.

## Features

### Combat Sandbox

Visual interface for testing combat mechanics:

- **Team Setup** - Configure ALPHA and BRAVO teams
- **Actor Configuration** - Customize shells, weapons, ammo, and stats
- **Turn-Based Combat** - Step through combat round-by-round
- **AI Control** - Automate actors with intelligent behavior
- **Event Replay** - See exactly what happened each turn

### Architecture

Built with functional programming principles:

- **Pure functions** - All game logic is deterministic
- **Dependency injection** - Testable hooks with explicit dependencies
- **React 19** - Concurrent features and automatic batching
- **Type safety** - Strict TypeScript throughout

## Project Structure

```
src/
├── apps/               # Application-specific tools
│   └── combat/        # Combat sandbox tool
│       ├── components/ # UI components
│       ├── hooks/     # Custom React hooks
│       └── CombatTool.tsx
├── shared/            # Shared utilities
│   └── utils/        # Pure utility functions
└── App.tsx           # Root application
```

## Integration

The tools integrate with:

- **@flux/core** - Game engine for state management
- **@flux/ui** - UI components and theming

This allows you to test real game mechanics with actual game engine code, ensuring tools stay synchronized with implementation.

## Theming

Uses CSS custom properties from `@flux/ui`:

```typescript
<div style={{
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-family-heading)'
}}>
```

## Development

The package uses:

- **Vite** - Fast builds and HMR
- **React 19** - Latest React features
- **TypeScript 5.8** - Strict type checking
- **Vitest** - Fast unit testing

## Testing Philosophy

Tests focus on:

- Pure function behavior
- Component public interfaces
- Real integration with @flux/core
- Type safety guarantees

Dependencies are injected for testability, but tests use real implementations where possible for higher confidence.

## License

MIT License

This is free software with maximum permissive licensing. You can use these development tools in any project, modify them however you want, and keep your modifications private. Just include the copyright notice and license text.
