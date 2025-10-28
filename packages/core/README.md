
# Flux Game Engine Core

This is the **pure functional core** of the Flux Simulation Project.

### Basic Usage

```typescript
import {
  createTransformerContext,
  executeCommand,
  createCommand,
  CommandType
} from '@flux/core';

// Create a game world context
const context = createTransformerContext();

// Execute a game command
const command = createCommand(CommandType.LOOK, { actor: 'alice' });
const updatedContext = executeCommand(context, command);

// Access the results
console.log(updatedContext.getDeclaredEvents());
```

### Interactive CLI

Experience the full game engine through the interactive CLI:

```bash
npm run cli
```

```
╔══════════════════════════════════════════════════════════════════╗
║                    Flux Game Engine CLI/REPL                     ║
║                                                                  ║
║  Interactive command-line interface for testing and development  ║
║  Type 'help' for available commands or 'exit' to quit            ║
╚══════════════════════════════════════════════════════════════════╝

> look
📖 You are in a cozy tavern. Alice and Bob are here.

> attack goblin
📖 You strike the goblin with your sword for 8 damage!

> help
Available Commands:
  attack <target>    - Attack an enemy
  defend             - Raise your defenses
  look [target]      - Examine your surroundings
  move <direction>   - Travel to another location
  party invite <actor> - Invite someone to your party
```

## 🏗️ Architecture

### Pure Functional Pipeline

Flux processes all game actions through a deterministic pipeline:

```
Intent → Command → Handler → World State → Events
```

- **Intents**: Raw player input ("attack goblin")
- **Commands**: Structured, validated actions
- **Handlers**: Pure functions that transform world state
- **Events**: Declarative results with embedded narratives

### Command System

Every game action is implemented as a pure function handler:

```typescript
// Example: Strike command handler
export const strikeReducer = (
  context: TransformerContext,
  command: StrikeCommand
): TransformerContext => {
  // Pure game logic - no side effects
  const { target, weapon } = command.args;
  const damage = calculateDamage(context.actor, target, weapon);

  // Declare events (pure data)
  context.declareEvent({
    type: 'COMBATANT_DID_ATTACK',
    payload: { target, damage, weapon }
  });

  return updatedContext;
};
```

### Development Setup

```bash
# Clone and install
npm install

# Run tests
npm test

# Build the project
npm run build

# Start the CLI
npm run cli
```

### Code Style

- **Pure functions** wherever possible
- **TypeScript strict mode** with full type coverage
- **Comprehensive tests** for all game mechanics
- **Zero side effects** in game logic
- **Functional programming** patterns

## 🏢 Commercial Use

This project is licensed under **CC BY-NC-SA 4.0**, which allows:

**Non-commercial use**: Free for personal projects, education, and research
**Modification**: Build upon and extend the engine
**Sharing**: Distribute your modifications under the same license

## 📄 License

This project is licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** - see the [LICENSE](LICENSE) file for details.

---
