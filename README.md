# Flux Simulation Project

A text-based multiplayer simulation game built with functional programming principles. Players navigate a procedurally generated world with weather systems, combat mechanics, and real-time networking.

## Architecture

This is a monorepo containing five interconnected packages:

### @flux/core

The pure functional game engine. All game logic is implemented as deterministic pure functions that transform world state. Commands flow through a functional pipeline: Intent → Command → Handler → World State → Events. No side effects in the core game logic.

- **Zero runtime dependencies** - Self-contained with no external packages
- **Pure functional architecture** - Deterministic, testable game logic
- **Multi-format builds** - CommonJS, ESM, and TypeScript definitions
- **Command system** - Every game action is a pure function handler
- **License**: MIT

### @flux/cli

Command-line interface for testing and development. Provides an interactive REPL for executing game commands and benchmarking performance. Depends on @flux/core.

### @flux/guide

Player documentation built with Astro and Starlight. Interactive examples use @flux/core for live demonstrations and @flux/ui for embedded components.

### @flux/tools

Web-based development tools built with React 19. Includes a combat sandbox for testing mechanics, visualizing state, and debugging game logic. Uses @flux/core for game state and @flux/ui for interface components.

- **Combat sandbox** - Test 3v3 combat scenarios
- **Dependency injection** - Pure functions with explicit dependencies
- **React 19** - Built on latest React features

### @flux/ui

React 19 UI component library with domain-driven architecture. Provides terminal interfaces, theming, and list virtualization. Used by @flux/guide and @flux/tools.

## Package Dependencies

```
@flux/core
    ├── @flux/cli
    ├── @flux/guide (also uses @flux/ui)
    └── @flux/tools (also uses @flux/ui)

@flux/ui
    ├── @flux/guide
    └── @flux/tools
``
