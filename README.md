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
```

## Development

The project uses TypeScript strict mode, Vitest for testing, and Vite for builds. All packages follow functional programming patterns with pure functions, immutable state, and explicit side effects.

## License

This project is licensed under **MIT License**.

### What This Means

MIT is a maximally permissive open source license:

- ✅ **Use freely** - Use in any project, commercial or open source
- ✅ **Modify freely** - Change, adapt, or remove anything you want
- ✅ **No restrictions** - No requirement to share modifications or improvements
- ✅ **Just give credit** - Include the copyright notice and license text

### Why MIT?

We believe in maximum freedom and transparency:

**Transparent Game Mechanics**
All game logic in @flux/core is open source. Players can audit combat calculations, movement rules, and every game system. No hidden mechanics. No black boxes. Pure trust through transparency.

**Maximum Flexibility**
Use the code however you want. Build proprietary servers. Fork it for different game concepts. Adapt it to your needs. We don't need improvements back—we're confident in our execution and server infrastructure.

### The Strategy

**Open Source (MIT):**
- Game engine (@flux/core) - All game mechanics and rules
- Development tools (@flux/cli, @flux/tools) - Testing and development
- UI components (@flux/ui) - Interface building blocks
- Documentation (@flux/guide) - Player guides and references

**Your Choice:**
- Build open source servers and share everything
- Build proprietary servers using the open game engine
- Fork and adapt for completely different game concepts
- Use in commercial products without restrictions

### For Server Operators

You can build a Flux server however you want:
- Use @flux/core for game logic (MIT license)
- Keep your server infrastructure private if you choose
- Modify game mechanics to fit your game concept
- Run commercial servers without any licensing restrictions
- No requirement to share improvements back

This ensures game mechanics remain transparent while giving you complete freedom to adapt and build.
