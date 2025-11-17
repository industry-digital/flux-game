# @flux/ui

React 19 UI component library with domain-driven architecture and functional programming patterns.

## What It Does

Provides reusable UI components for Flux applications:

- **Terminal Interface** - Command-line style UI with virtualization
- **Theme System** - Dark/light modes with CSS custom properties
- **List Virtualization** - High-performance rendering for large datasets
- **Infrastructure** - Core hooks and utilities

## Installation

```bash
npm install @flux/ui react react-dom
```

## Usage

```typescript
import { useTerminal, useTheme, useVirtualizedList } from '@flux/ui';
import '@flux/ui/style.css';

function MyApp() {
  const terminal = useTerminal();
  const theme = useTheme('dark');

  terminal.print('Hello, world!');

  return <div>{terminal.render()}</div>;
}
```

## Running

```bash
# Build the library
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Type check
npm run type-check
```

## Features

### Terminal Component

Command-line interface with automatic scrolling and virtualization:

```typescript
const terminal = useTerminal({
  maxEntries: 1000,
  scrollToBottom: true
});

terminal.print('> look');
terminal.print('You are in a tavern.');
terminal.clear();
```

### Theme System

Runtime theme switching with Gruvbox Material color schemes:

```typescript
const theme = useTheme('dark'); // or 'light'

// Automatically sets CSS custom properties:
// --color-background, --color-text, etc.
```

### List Virtualization

High-performance rendering for large lists:

```typescript
const virtualization = useVirtualizedList(items, {
  itemHeight: 24,
  overscan: 5,
  viewportHeight: 400
});

// Only renders visible items
virtualization.visibleItems.forEach(item => {
  // Render only what's on screen
});
```

## Architecture

### Domain Independence

Each UI domain is independent:

- **theme/** - Theme management
- **terminal/** - Terminal interface
- **list/** - List virtualization
- **infrastructure/** - Core utilities

Types are centralized in `types/` to prevent cross-domain coupling.

### Dependency Injection

Hooks accept dependencies for testability:

```typescript
const terminalHook = createTerminalHook({
  timestamp: () => Date.now(),
  useTheme: useTheme,
  useVirtualizedList: useVirtualizedList
});
```

### Composition Root Pattern

Convenience APIs wire up dependencies:

```typescript
// For consumers - batteries included
import { useTerminal } from '@flux/ui';

// For testing - inject dependencies
import { createTerminalHook } from '@flux/ui/src/terminal';
const useTerminal = createTerminalHook(mockDeps);
```

## Project Structure

```
src/
├── types/            # Centralized type definitions
├── theme/           # Theme system
├── terminal/        # Terminal component
├── list/           # List virtualization
└── infrastructure/ # Core utilities
```

Each domain follows the same structure:

```
domain/
├── index.ts         # Exports and convenience API
├── types.ts         # Re-exports from ~/types
├── hooks/           # React hooks
├── components/      # React components
└── testing.ts       # Mock utilities
```

## Styling

Uses CSS custom properties for theming:

```css
.my-component {
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  font-family: var(--font-family-mono);
}
```

Available custom properties:

- Colors: `--color-background`, `--color-text`, `--color-primary`, etc.
- Typography: `--font-family-mono`, `--font-family-heading`, `--font-size-*`
- Spacing: `--space-*`, `--radius-*`

## Testing

Tests use real implementations for integration confidence:

```typescript
const testDeps = {
  timestamp: vi.fn(() => 1234567890), // Mock only time
  useTheme: useTheme,                  // Real theme
  useVirtualizedList: useVirtualizedList // Real virtualization
};

const useTerminal = createTerminalHook(testDeps);
const { result } = renderHook(() => useTerminal());
```

## Performance

- **React 19** - Concurrent features and automatic batching
- **Virtualization** - Only renders visible items
- **Stable references** - Prevents unnecessary re-renders
- **CSS custom properties** - Runtime theme switching without re-renders

## Package Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./style.css": "./dist/style.css"
  }
}
```

## License

MIT License

This is free software with maximum permissive licensing. You can use this UI library in any project (open source or proprietary), modify it however you want, and keep your modifications private. Just include the copyright notice and license text.
