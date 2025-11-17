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
- **Performance**: Direct mutation eliminates allocation overhead (4-8X faster than immutable updates)

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

**Benchmark Results:**
Benchmarks show mutation is **4-10x faster** than immutable updates across typical game operations (move actor, update inventory, take damage, complex operations). See [Appendix: Benchmark Results](#appendix-benchmark-results) for full details.

### Direct `for..in` Iteration

**The Tradeoff:**
We use `for..in` loops directly instead of the defensive `Object.keys()` pattern that has become a modern JavaScript best practice.

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

**Benchmark Results:**
For small objects (<100 keys), `for..in` is **4x faster** than `Object.keys()`. For larger objects (100+ keys), `Object.keys()` becomes faster due to better cache locality. The crossover point is around 100 keys. See [Appendix: Benchmark Results](#appendix-benchmark-results) for full details.


**When to Use Each:**
- **Use `for..in`**: When you control object creation (our case) and objects have fewer than ~100 keys
- **Use `Object.keys()`**: When dealing with untrusted data or external APIs, or when objects have many keys (100+). For large objects, the contiguous array layout provides better CPU cache locality than iterating over scattered object properties, and the array allocation overhead is amortized over the larger key set.

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

## Appendix: Benchmark Results

Full benchmark results for the performance tradeoffs discussed above. Benchmarks can be run directly:

```bash
# Mutation vs Immutable
npx tsx src/mutation-vs-immutable.ts

# Object iteration
npx tsx src/object-iteration.benchmark.ts
```

### Mutation vs Immutable Updates

```
📊 BENCHMARK RESULTS
================================================================================
Game State Updates: Move Actor (Mutation):
  8918816.47 ops/sec
  0.0001ms avg
  11.21ms total (100,000 iterations)

Game State Updates: Move Actor (Immutable):
  1209488.44 ops/sec
  0.0008ms avg
  82.68ms total (100,000 iterations)

Game State Updates: Update Inventory (Mutation):
  84982850.46 ops/sec
  0.0000ms avg
  1.18ms total (100,000 iterations)

Game State Updates: Update Inventory (Immutable):
  8664603.51 ops/sec
  0.0001ms avg
  11.54ms total (100,000 iterations)

Game State Updates: Take Damage (Mutation):
  101240192.36 ops/sec
  0.0000ms avg
  0.99ms total (100,000 iterations)

Game State Updates: Take Damage (Immutable):
  19805247.08 ops/sec
  0.0001ms avg
  5.05ms total (100,000 iterations)

Game State Updates: Complex Operation (Mutation):
  8954890.01 ops/sec
  0.0001ms avg
  11.17ms total (100,000 iterations)

Game State Updates: Complex Operation (Immutable):
  2077605.50 ops/sec
  0.0005ms avg
  48.13ms total (100,000 iterations)


📈 PERFORMANCE COMPARISON
================================================================================
Move Actor:
  Mutation:   8918816.47 ops/sec
  Immutable:  1209488.44 ops/sec
  ✅ Mutation is 7.37x faster
  ⚠️  Immutable is 637.4% slower

Update Inventory:
  Mutation:   84982850.46 ops/sec
  Immutable:  8664603.51 ops/sec
  ✅ Mutation is 9.81x faster
  ⚠️  Immutable is 880.8% slower

Take Damage:
  Mutation:   101240192.36 ops/sec
  Immutable:  19805247.08 ops/sec
  ✅ Mutation is 5.11x faster
  ⚠️  Immutable is 411.2% slower

Complex Operation:
  Mutation:   8954890.01 ops/sec
  Immutable:  2077605.50 ops/sec
  ✅ Mutation is 4.31x faster
  ⚠️  Immutable is 331.0% slower
```

### Object Iteration: `for..in` vs `Object.keys()`

```
📊 BENCHMARK RESULTS
================================================================================
Object Iteration Performance: Small Object (10 keys) - for..in:
  53339850.75 ops/sec
  0.0000ms avg
  18.75ms total (1,000,000 iterations)

Object Iteration Performance: Small Object (10 keys) - Object.keys():
  12925553.66 ops/sec
  0.0001ms avg
  77.37ms total (1,000,000 iterations)

Object Iteration Performance: Small Object (10 keys) - Object.keys().forEach():
  12043114.35 ops/sec
  0.0001ms avg
  83.03ms total (1,000,000 iterations)

Object Iteration Performance: Small Object (10 keys) - Object.entries():
  15554639.56 ops/sec
  0.0001ms avg
  64.29ms total (1,000,000 iterations)

Object Iteration Performance: Medium Object (100 keys) - for..in:
  443615.71 ops/sec
  0.0023ms avg
  225.42ms total (100,000 iterations)

Object Iteration Performance: Medium Object (100 keys) - Object.keys():
  615218.03 ops/sec
  0.0016ms avg
  162.54ms total (100,000 iterations)

Object Iteration Performance: Large Object (1000 keys) - for..in:
  38485.82 ops/sec
  0.0260ms avg
  259.84ms total (10,000 iterations)

Object Iteration Performance: Large Object (1000 keys) - Object.keys():
  51788.90 ops/sec
  0.0193ms avg
  193.09ms total (10,000 iterations)

Object Iteration Performance: Very Large Object (10000 keys) - for..in:
  1262.49 ops/sec
  0.7921ms avg
  792.08ms total (1,000 iterations)

Object Iteration Performance: Very Large Object (10000 keys) - Object.keys():
  1353.12 ops/sec
  0.7390ms avg
  739.03ms total (1,000 iterations)


📈 PERFORMANCE COMPARISON
================================================================================
Small Object (10 keys):
  for..in:        53339850.75 ops/sec
  Object.keys(): 12925553.66 ops/sec
  ✅ for..in is 4.13x faster
  ⚠️  Object.keys() is 312.7% slower

Medium Object (100 keys):
  for..in:        443615.71 ops/sec
  Object.keys(): 615218.03 ops/sec
  ⚠️  Object.keys() is 1.39x faster
  ✅ for..in is 38.7% slower

Large Object (1000 keys):
  for..in:        38485.82 ops/sec
  Object.keys(): 51788.90 ops/sec
  ⚠️  Object.keys() is 1.35x faster
  ✅ for..in is 34.6% slower

Very Large Object (10000 keys):
  for..in:        1262.49 ops/sec
  Object.keys(): 1353.12 ops/sec
  ⚠️  Object.keys() is 1.07x faster
  ✅ for..in is 7.2% slower
```
