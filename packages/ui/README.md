# @flux/ui - React 19 UI Library

A production-ready, domain-driven UI library built with React 19, TypeScript, and architectural patterns that prioritize maintainability, testability, and developer experience.

## 🏗️ Architectural Journey

This library evolved through a deliberate architectural journey focused on achieving **domain independence** while maintaining **practical usability**. The result is a clean, composable system that demonstrates several advanced patterns in modern React development.

### Key Architectural Decisions

1. **Domain-Driven Structure**: Each UI concern is organized into independent domains
2. **Centralized Type System**: All types hoisted to prevent cross-domain coupling
3. **Dependency Injection**: Pure functions with injected dependencies for testability
4. **Composition Root Pattern**: Dependencies wired at application boundaries
5. **Concrete Testing**: Real implementations over brittle mocks

## 📁 Project Structure

```
src/
├── types/                    # Centralized type definitions
│   ├── index.ts             # Barrel exports for all types
│   ├── theme.ts             # Theme system types & hook signatures
│   ├── list.ts              # Virtualization types & hook signatures
│   └── terminal.ts          # Terminal component types & dependencies
├── theme/                   # Theme management domain
│   ├── index.ts             # Domain barrel exports
│   ├── types.ts             # Re-exports from ~/types/theme
│   ├── useTheme.ts          # Theme hook implementation
│   ├── useTheme.spec.ts     # Comprehensive tests (12 tests)
│   ├── testing.ts           # Mock utilities for consumers
│   └── themes/
│       ├── dark.ts          # Gruvbox Material Dark theme
│       └── light.ts         # Gruvbox Material Light theme
├── list/                    # List virtualization domain
│   ├── index.ts             # Domain barrel exports
│   ├── types.ts             # Re-exports from ~/types/list
│   ├── testing.ts           # Mock utilities with functional behavior
│   └── hooks/
│       ├── index.ts         # Hook barrel exports
│       └── useVirtualizedList.ts # High-performance virtualization
├── terminal/                # Terminal interface domain
│   ├── index.ts             # Domain barrel exports + convenience API
│   ├── types.ts             # Re-exports from ~/types/terminal
│   ├── style.css            # Theme-aware CSS with custom properties
│   ├── composition.ts       # Dependency wiring helpers
│   ├── hooks/
│   │   ├── index.ts         # Hook barrel exports
│   │   ├── useTerminal.ts   # Pure terminal logic with DI
│   │   └── useTerminal.spec.ts # Comprehensive tests (23 tests)
│   └── components/
│       ├── index.ts         # Component barrel exports
│       └── Terminal.tsx     # React component with virtualization
├── infrastructure/          # Foundation utilities
│   ├── index.ts             # Infrastructure barrel exports
│   ├── environment/         # Environment variable management
│   └── hooks/               # Core utility hooks
└── testing/                 # Shared test configuration
    └── setup.ts             # Vitest + React Testing Library setup
```

## 🎯 Core Architectural Patterns

### 1. Domain Independence Through Type Hoisting

**Problem**: Domains importing from each other creates tight coupling.

**Solution**: Centralize all types in `~/types/` with strongly typed hook signatures.

```typescript
// ~/types/terminal.ts - No concrete imports!
export type TerminalDependencies = {
  timestamp: () => number;
  useTheme: UseThemeHook;           // Strongly typed hook signature
  useVirtualizedList: UseVirtualizedListHook; // Strongly typed hook signature
};

// ~/types/theme.ts - Hook signature definition
export type UseThemeHook = (
  initialTheme?: ThemeName,
  deps?: ThemeDependencies
) => ThemeHook;
```

**Benefits**:
- ✅ Compile-time type checking across domain boundaries
- ✅ Single source of truth for hook contracts
- ✅ Refactoring safety without tight coupling
- ✅ Clear dependency contracts

### 2. Factory Pattern with Dependency Injection

**Problem**: React hooks can't be easily tested in isolation.

**Solution**: Factory functions that accept dependencies, returning configured hooks.

```typescript
// Pure factory - no cross-domain imports
export const createTerminalHook = (deps: TerminalDependencies) => {
  return function useTerminal(config = {}, virtualizationConfig = {}, themeName = 'dark') {
    // Use injected dependencies
    const theme = deps.useTheme(themeName);
    const virtualization = deps.useVirtualizedList([], virtualizationConfig);

    // Pure terminal logic...
    return { print, render, clear, /* ... */ };
  };
};
```

**Benefits**:
- ✅ Pure functions - easy to test and reason about
- ✅ Dependencies explicit and mockable
- ✅ No React Rules of Hooks violations
- ✅ Composable at runtime

### 3. Composition Root Pattern

**Problem**: Someone needs to wire up the dependencies.

**Solution**: Composition helpers that provide convenience APIs while keeping core logic pure.

```typescript
// terminal/composition.ts - Wires up concrete implementations
export const useTerminalWithDependencies = (config = {}, virtualizationConfig = {}, themeName = 'dark') => {
  const deps: TerminalDependencies = {
    timestamp: () => Date.now(),
    useTheme: useTheme,           // Concrete implementation
    useVirtualizedList: useVirtualizedList, // Concrete implementation
  };

  const terminalHook = createTerminalHook(deps);
  return terminalHook(config, virtualizationConfig, themeName);
};

// terminal/index.ts - Convenience export
export { useTerminalWithDependencies as useTerminal } from './composition';
```

**Benefits**:
- ✅ Easy-to-use API for consumers
- ✅ Pure core logic remains testable
- ✅ Dependencies wired at application boundaries
- ✅ Multiple composition strategies possible

### 4. Concrete Implementation Testing

**Problem**: Mock-heavy tests are brittle and don't test real integration.

**Solution**: Use real implementations in tests, mock only what you need to control.

```typescript
// Tests use real hooks for integration confidence
const testDeps: TerminalDependencies = {
  timestamp: vi.fn(() => 1234567890), // Mock only time for determinism
  useTheme: useTheme,                  // Real theme implementation
  useVirtualizedList: useVirtualizedList, // Real virtualization
};

const useTerminal = createTerminalHook(testDeps);
const { result } = renderHook(() => useTerminal());

// Test real behavior, not mock approximations
expect(result.current.visibleEntries).toHaveLength(0);
```

**Benefits**:
- ✅ Tests break when behavior actually changes
- ✅ Higher confidence in real system behavior
- ✅ Less test maintenance overhead
- ✅ Integration testing catches interface mismatches

### 5. Standardized Domain Module Structure

**Problem**: Inconsistent organization makes navigation difficult.

**Solution**: Every domain follows the same structure pattern.

```
domain/
├── index.ts          # Barrel exports + convenience APIs
├── types.ts          # Re-exports from ~/types/domain
├── style.css         # Domain-specific CSS (if needed)
├── testing.ts        # Mock utilities for consumers
├── hooks/            # React hooks
│   ├── index.ts      # Hook barrel exports
│   ├── useHook.ts    # Hook implementation
│   └── useHook.spec.ts # Hook tests
└── components/       # React components (if any)
    ├── index.ts      # Component barrel exports
    └── Component.tsx # Component implementation
```

**Benefits**:
- ✅ Predictable navigation
- ✅ Clear separation of concerns
- ✅ Consistent import patterns
- ✅ Easy to scaffold new domains

## 🧪 Testing Philosophy

### Pure Functions Over Mocks

We prioritize **concrete implementations** over mocks because:

- **Real Behavior**: Tests exercise actual integration paths
- **Less Brittle**: Tests don't break when implementation details change
- **Higher Confidence**: If tests pass, the real system works
- **Faster Development**: No mock maintenance overhead

### When to Mock vs When to Use Real

**Mock when:**
- External services (APIs, databases)
- Time-dependent behavior (`timestamp: () => Date.now()`)
- Non-deterministic behavior (random numbers, UUIDs)
- Expensive operations (file I/O, network calls)

**Use real when:**
- Pure functions and hooks (theme, virtualization)
- In-memory operations
- Deterministic algorithms
- Domain logic

## 🎨 Theming System

### CSS Custom Properties Integration

The theme system uses CSS custom properties for runtime theme switching:

```typescript
// Themes define color palettes
export const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    background: '#282828',
    text: '#ebdbb2',
    // ...
  },
};

// useTheme applies CSS custom properties
const theme = useTheme('dark');
// Sets --color-background: #282828, --color-text: #ebdbb2, etc.
```

```css
/* Components use CSS custom properties */
.terminal {
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

**Benefits**:
- ✅ Runtime theme switching without re-renders
- ✅ CSS-in-CSS for better performance
- ✅ Automatic theme inheritance
- ✅ Easy to add new themes

## 🚀 Performance Optimizations

### List Virtualization

High-performance rendering of large datasets:

```typescript
const virtualization = useVirtualizedList(items, {
  itemHeight: 24,        // Fixed or dynamic height
  overscan: 5,          // Render extra items for smooth scrolling
  viewportHeight: 400,  // Visible area height
});

// Only renders visible items + overscan buffer
console.log(virtualization.visibleItems); // ~17 items for 400px viewport
console.log(items.length);                // Could be 10,000+ items
```

### React 19 Optimizations

- **Concurrent Features**: Built for React 19's concurrent rendering
- **Automatic Batching**: State updates batched for performance
- **Memoization**: Strategic use of `useMemo` and `useCallback`
- **Stable References**: Consistent object references to prevent re-renders

## 📦 Package Exports

The library provides multiple export strategies:

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./src": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    },
    "./src/*": {
      "import": "./src/*",
      "types": "./src/*"
    }
  }
}
```

**Usage patterns:**

```typescript
// Full library import
import { useTerminal, useTheme, useVirtualizedList } from '@flux/ui';

// Domain-specific imports
import { useTerminal } from '@flux/ui/src/terminal';
import { useTheme } from '@flux/ui/src/theme';

// Direct hook imports for tree-shaking
import { createTerminalHook } from '@flux/ui/src/terminal/hooks';
import { createMockUseVirtualizedList } from '@flux/ui/src/list/testing';
```

## 🔧 Development Workflow

### Path Aliases

Consistent `~/*` alias for internal imports:

```typescript
// tsconfig.json, vite.config.ts, vitest.config.ts all aligned
import { TerminalDependencies } from '~/types';
import { useTheme } from '~/theme';
import { useVirtualizedList } from '~/list';
```

### Testing Commands

```bash
# Run all tests
npm test

# Run specific domain tests
npm test -- --run src/terminal/hooks/useTerminal.spec.ts
npm test -- --run src/theme/useTheme.spec.ts

# Watch mode for development
npm run test:watch
```

### Type Checking

```bash
# Full type check
npm run type-check

# Build (includes type checking)
npm run build
```

## 🎯 Key Metrics

- **69 Tests Passing**: Comprehensive test coverage across all domains
- **4 Domain Modules**: Theme, Terminal, List, Infrastructure
- **28 TypeScript Files**: Fully typed codebase
- **Zero Cross-Domain Imports**: Pure domain independence
- **100% Type Safety**: Compile-time checking of all interfaces

## 🚀 Future Extensibility

This architecture scales naturally:

### Adding New Domains

1. **Define types** in `~/types/new-domain.ts`
2. **Create domain module** following standard structure
3. **Export from main index** for discoverability
4. **Write tests** using concrete implementations

### Adding New Components

1. **Identify domain** (or create new one)
2. **Define component interface** in domain types
3. **Implement with dependency injection** if needed
4. **Test with real dependencies**

### Adding New Themes

1. **Define theme config** in `theme/themes/`
2. **Export from theme domain**
3. **CSS custom properties** automatically work
4. **Test theme switching** in existing tests

## 🏆 Architectural Achievements

This library demonstrates several advanced patterns:

- ✅ **Hexagonal Architecture**: Pure core, adapters at boundaries
- ✅ **Functional Core, Imperative Shell**: Pure logic, side effects isolated
- ✅ **Dependency Inversion**: High-level modules don't depend on low-level
- ✅ **Interface Segregation**: Clean contracts between domains
- ✅ **Single Responsibility**: Each domain has one reason to change
- ✅ **Composition over Inheritance**: Behavior composed at runtime

The result is a **maintainable**, **testable**, and **extensible** codebase that serves as a reference implementation for modern React architecture patterns.
