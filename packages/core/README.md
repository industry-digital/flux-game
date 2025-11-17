# @flux/core

Pure functional game engine for the Flux Simulation Project. All game logic implemented as deterministic functions with zero runtime dependencies.

## What It Does

Processes game actions through a functional pipeline:

```
Intent → Command → Handler → World State → Events
```

Everything is a pure function - no side effects, no I/O, just data transformation. This makes the game logic deterministic, testable, and easy to reason about.

## Quick Start

```typescript
import { createTransformerContext, createIntent, executeIntent } from '@flux/core';

// Create a game world
const context = createTransformerContext();

// Execute a command
const intent = createIntent({
  type: 'LOOK',
  actor: 'alice' as ActorURN,
  args: {}
});

const result = executeIntent(context, intent);

// Access events
console.log(result.context.getDeclaredEvents());
```

## Features

- **Zero runtime dependencies** - Self-contained with no external packages
- **Pure functional** - All game logic is deterministic and side-effect free
- **Multi-format builds** - CommonJS, ESM, and TypeScript definitions
- **Type-safe** - Full TypeScript coverage with strict mode
- **Command system** - Extensible handler architecture
- **Event-driven** - Declarative narrative generation

## Running

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build all formats (CJS, ESM, Types)
npm run build

# Type check without building
npm run type-check

# Check for circular dependencies
npm run check-circular
```

## Build Outputs

The package builds to three formats:

- `dist/cjs/` - CommonJS for Node.js
- `dist/esm/` - ES Modules for modern bundlers
- `dist/types/` - TypeScript definitions

## Game Systems

The core includes implementations of:

- **Movement** - Grid-based navigation
- **Combat** - Turn-based fighting with teams, weapons, and tactics
- **Inventory** - Item management and equipment
- **Party** - Group formation and management
- **Evasion** - Dodge and defensive mechanics
- **Narrative** - Dynamic event descriptions

## Architecture

Every game action follows this pattern:

```typescript
// Command reducer - pure function
export const moveReducer = (
  context: TransformerContext,
  command: MoveCommand
): TransformerContext => {
  const { world, declareEvent } = context;
  const { dest } = command.args;
  const actor = world.actors[command.actor];
  const origin = world.places[actor.location];
  const destination = world.places[dest];

  // Direct mutation for performance (see Performance Tradeoffs section)
  destination.entities[actor.id] = origin.entities[actor.id];
  delete origin.entities[actor.id];
  actor.location = destination.id;

  // Declare events (pure data)
  declareEvent({
    type: 'ACTOR_DID_MOVE',
    payload: { origin: origin.id, destination: destination.id }
  });

  return context;
};
```

Key principles:

- **Pure functions** - Deterministic transformations with no hidden side effects
- **Direct mutation** - Performance-optimized mutations in single-threaded context (see Performance Tradeoffs)
- **Functional composition** - Build complex behaviors from simple functions
- **Event sourcing** - Actions produce events, not direct mutations
- **Type safety** - Comprehensive TypeScript types for all commands and events

## Deliberate Performance Tradeoffs

This codebase makes deliberate architectural decisions that prioritize performance and correctness over conventional JavaScript wisdom.

### Direct Mutation for Performance

**The Tradeoff:**
We use direct mutation instead of immutable updates in reducers. This violates conventional functional programming wisdom, but it's mathematically pure in our execution model.

**Why This Works:**
- **Single-threaded execution**: Commands execute sequentially in a single-threaded context
- **No concurrency concerns**: No shared state across threads or async boundaries
- **Mathematical purity**: In a single-threaded space, mutation is equivalent to immutability
- **Performance**: Direct mutation eliminates allocation overhead (orders of magnitude faster)

**Example:**
```typescript
// Direct mutation (what we do)
destination.entities[actor.id] = actorDescriptor;
delete origin.entities[actor.id];
actor.location = destination.id;

// vs. Immutable update (what we don't do)
const newDestination = {
  ...destination,
  entities: { ...destination.entities, [actor.id]: actorDescriptor }
};
const newOrigin = {
  ...origin,
  entities: { ...origin.entities }
};
delete newOrigin.entities[actor.id];
```

### Direct `for..in` Iteration

**The Tradeoff:**
We use `for..in` loops directly instead of the defensive `Object.keys()` pattern that modern JavaScript developers are taught.

**Why Defensive Patterns Exist:**
The `Object.keys()` pattern exists to protect against prototype pollution, which happens when objects inherit enumerable properties from their prototype chain. This is a real risk when dealing with untrusted data or objects created by external code.

**Why This Works in Our Context:**
- **Controlled object creation**: We control all object creation in the codebase. Objects are created with clear ownership boundaries and never inherit enumerable properties from external sources.
- **No prototype pollution**: Objects are created with `{}` or object literals, never inherit enumerable properties from prototypes
- **Zero allocation**: Direct iteration avoids intermediate array allocation (`Object.keys()` creates a new array)
- **Performance**: `for..in` is measurably faster in hot paths (V8 optimizes direct property iteration)

**Example:**
```typescript
// Direct iteration (what we do)
for (let direction in origin.exits) {
  const potentialExit = origin.exits[direction as Direction]!;
  // ...
}

// vs. Defensive pattern (what we don't do)
for (const direction of Object.keys(origin.exits)) {
  const potentialExit = origin.exits[direction as Direction]!;
  // ...
}
```

**When to Use Each:**
- **Use `for..in`**: When you control object creation (our case)
- **Use `Object.keys()`**: When dealing with untrusted data or external APIs

These tradeoffs are informed by our:
- Learnings from extensive benchmarking of V8
- Understanding of our specific execution model

## Testing

The test suite includes:

- Unit tests for all command handlers
- Integration tests for game systems
- Benchmarks for performance-critical paths

All tests run in-process with no external dependencies.

## Learn More

- **[Monorepo README](../../README.md)** - Overview of all Flux packages
- **[Server Architecture](../../../server/docs/arch/architecture.md)** - How the game engine integrates with the server
- **[First Principles](../../../server/docs/first-principles.md)** - Design philosophy and values

## Contributing

This package is part of the Flux Simulation Project. Contributions are welcome! When contributing:

- Follow the existing code style (functional, pure functions, TypeScript strict mode)
- Add tests for new commands or game systems
- Update this README if adding new features
- See the [monorepo README](../../README.md) for development setup

## License

MIT License

This is free software with maximum permissive licensing:
- You can use this library in any project (open source or proprietary)
- You can modify, adapt, or remove anything you want
- No requirement to share modifications or improvements
- Just include the copyright notice and license text
