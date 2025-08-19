# Game Logic DevTools: Interactive Command Execution

## The Core Problem

Game developers working with pure command handlers face a **compilation boundary** that breaks their flow:

```
Write handler → Start server → Connect client → Setup scenario → Test → Debug
Time per iteration: 3-5 minutes
Mental context switches: High
```

## The Solution: Execute This Command Right Here

A VS Code extension that provides **one core feature**: **instant command execution** with a single button click.

```
f : (W, C) → (W', E)
```

Where
- **W** = Auto-generated world state
- **C** = Command with sensible defaults
- **W'** = Result world state
- **E** = Declared events

Click button → See results in 2 seconds.

## The Minimum Viable Experience

### Core Feature: CodeLens Integration

```typescript
// Developer sees this in their command handler:
export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  // [🧪 Execute] ← CodeLens button appears here
  const { world, declareEvent, declareError } = context;
  // ... game logic ...
};
```

### What Happens When You Click

1. **Auto-generate minimal world state** (no user input required)
2. **Create default command** (sensible parameters)
3. **Execute pure function** (isolated, safe)
4. **Show results** (before/after state, events, errors, timing)

### The Results Panel

```
┌─ COMMAND EXECUTION RESULT ─────────────────────────┐
│ Command: MOVE actor:test → place:forest            │
│ Execution Time: 0.8ms                              │
├─────────────────────────────────────────────────────┤
│ WORLD STATE CHANGES                                │
│ • actors.test.location: "tavern" → "forest"        │
│ • places.tavern.entities: removed test             │
│ • places.forest.entities: added test               │
│                                                     │
│ EVENTS DECLARED (1)                                │
│ • ACTOR_DID_MOVE { actor: "test", ... }           │
│                                                     │
│ ERRORS (0)                                         │
│ ✅ Command executed successfully                    │
└─────────────────────────────────────────────────────┘
```

## Why This Works

### Architectural Advantage
This is **only possible** with pure functional game logic:
- **No side effects** → Safe to execute anywhere
- **Deterministic** → Predictable results
- **Self-contained** → No external dependencies
- **Fast** → Sub-second execution

### Developer Impact
- **Removes compilation boundary** between code and execution
- **Instant feedback** on logic changes
- **Zero setup** required
- **Natural debugging** through observation

## Implementation Strategy

### Phase 1: The Button (2 weeks)
- VS Code extension with CodeLens integration
- Handler detection via AST parsing
- Template-based world state generation
- Basic command execution and results display

### Future Enhancements (After MVP Success)
- AI-powered world state generation
- Custom command parameters
- Multi-command sequences
- Time-travel debugging
- Team collaboration

## The Game Development Revolution

This single button transforms game development from:
- **Compile-test-debug cycles** → **Interactive exploration**
- **Context switching** → **Flow state**
- **Slow iteration** → **Instant feedback**

The Redux DevTools for game logic.

## Example Pure Game Logic

- [MOVE Command Handler](/src/command/MOVE/handler.ts)
