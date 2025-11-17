# @flux/cli

Interactive command-line interface for testing and developing the Flux game engine.

## What It Does

Provides a REPL (Read-Eval-Print Loop) for executing game commands, testing scenarios, and benchmarking performance. Built on top of `@flux/core` with zero side effects in the game logic layer.

```
╔══════════════════════════════════════════════════════════════════╗
║                    Flux Game Engine CLI/REPL                     ║
║                                                                  ║
║  Interactive command-line interface for testing and development  ║
║  Type 'help' for available commands or 'exit' to quit            ║
╚══════════════════════════════════════════════════════════════════╝

Scenario: Combat Training Arena
Three actors in a combat scenario...

Ready to accept commands!

> look
You see Alice and Bob in the training arena.

> attack bob
You strike Bob for 8 damage!
```

## Features

- **Interactive REPL** - Execute game commands in real-time
- **Scenario Loading** - Test different game scenarios
- **Command Queue** - Priority-based input processing
- **Memoization Layer** - Fast actor session and location lookups
- **Benchmarking Tools** - Performance testing utilities

## Running the CLI

```bash
# Start the interactive REPL
npm run dev

# Run tests
npm test

# Watch mode for development
npm run test:watch

# Run benchmarks
npm run bench
```

## Available Commands

Once in the REPL, you can:

- Execute game commands: `look`, `move`, `attack`, `defend`
- Switch actors: `actor <name>`
- Show context: `context`
- Load scenarios: `scenario <id>`
- Exit: `exit` or `quit`

## Architecture

Follows the "functional core, imperative shell" pattern:

- **Functional Core**: Pure game logic from `@flux/core`
- **Imperative Shell**: I/O operations, readline interface, output formatting
- **Effect System**: Side effects collected and executed at boundaries
- **Input Queue**: Non-blocking command processing with priority support

## Integration

This CLI is built for developers working on the game engine. It provides direct access to the core game logic without networking or persistence layers, making it ideal for:

- Testing command handlers
- Debugging game mechanics
- Benchmarking performance
- Rapid prototyping
- Scenario development

## License

MIT License

This is free software with maximum permissive licensing. You can use this CLI in any project, modify it however you want, and keep your modifications private. Just include the copyright notice and license text.
