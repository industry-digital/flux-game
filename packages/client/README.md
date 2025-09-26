# Flux MUD Client

A Multi-User Dungeon (MUD) client built with Vue 3.

## Architecture Overview

This client is designed around **domain-centric organization** with **strict boundary enforcement** between game systems. It consumes WorldEvents from an XMPP-based spatial simulation protocol and provides real-time, reactive gameplay experiences.

### Core Architectural Principles

#### 1. **Domain-Driven Organization**
```
src/
├── auth/           # Authentication & character management
├── combat/         # Combat sessions & tactical interfaces
├── spatial/        # Movement & location awareness
├── social/         # Chat & player interactions
├── xmpp/           # Real-time communication protocol
├── dispatch/       # Command & WorldEvent routing
└── types/          # Shared type definitions
```

Each domain is a **complete, self-contained module** with its own:
- `composables.ts` - Reactive business logic
- `types.ts` - Domain-specific interfaces (internal)
- `*.spec.ts` - Comprehensive test coverage

#### 2. **Composition Root Pattern**
`App.vue` serves as the **composition root** - the single place where domain composables are wired together and cross-domain interactions are orchestrated.

```vue
<!-- App.vue -->
<script setup lang="ts">
// Domain composables are independent
const auth = useAuth();
const xmpp = useXmppClient();
const combat = useCombat(auth.isMyActor, dispatch.sendCommand);

// Cross-domain orchestration happens here
worldEvents.onEvent((event) => {
  if (event.type.startsWith('COMBATANT_')) {
    combat.processEvent(event);
  }
});
</script>
```

#### 3. **Strict Domain Boundaries**
- **No cross-domain imports**: Domains cannot directly import each other's exports
- **Dependency injection**: Cross-domain dependencies are injected at the composition root
- **Shared types only**: Domains share type definitions but not behavior
- **Event-driven communication**: Domains communicate through WorldEvents and injected callbacks

#### 4. **WorldEvent-Driven Information Architecture**
All game information flows as **complete WorldEvents** with embedded narratives:

```typescript
import type {
  WorldEvent,
  EventType,
  ActorURN,
  PlaceURN,
  CombatantDidAttack,
  Narrative
} from '@flux/core';

// WorldEvents are strongly typed with comprehensive domain coverage
interface WorldEvent {
  id: string;                    // Unique event identifier
  ts: number;                    // Unix timestamp
  trace: string;                 // Command/intent that triggered event
  type: EventType;               // Enum of 30+ event types
  actor?: ActorURN;              // Who performed the action
  location: PlaceURN;            // Where it happened
  payload: EventPayload;         // Type-specific structured data
  significance?: number;         // 0-1 importance rating
  narrative?: Narrative;         // Human-readable descriptions
}

// Example: Combat attack with full context
const attackEvent: CombatantDidAttack = {
  id: "evt_123",
  ts: 1640995200000,
  trace: "cmd_strike_goblin",
  type: EventType.COMBATANT_DID_ATTACK,
  actor: "flux:actor:pc:alice",
  location: "flux:place:dungeon:chamber1",
  payload: {
    actor: "flux:actor:pc:alice",
    target: "flux:actor:npc:goblin",
    cost: { ap: 3, energy: 5 },
    roll: { dice: "1d20+5", result: 18 },
    outcome: "hit",
    attackRating: 15,
    evasionRating: 12
  },
  narrative: {
    self: "You strike the goblin with your sword!",
    observer: "Alice strikes the goblin with her sword!"
  }
};
```

## Technology Stack

### Core Framework
- **Vue 3** with Composition API
- **TypeScript** for full type safety
- **Vite** for development and building
- **Vitest** for testing

### Domain Integration
- **`@flux/core`** - Comprehensive type system and domain logic
- **`@flux/ui`** - Shared Vue components for game domains
- **XMPP Protocol** - Real-time spatial simulation communication

### Key Dependencies
- **Pinia** - State management (when needed)
- **Vue Router** - Navigation between game views
- **XMPP.js** - Real-time communication client

## Development Workflow

### 1. **Composables-First Development**
Start with domain composables before building UI components:

```bash
# Test-driven composable development
npm run test auth/composables.spec.ts
npm run test combat/composables.spec.ts
```

### 2. **Domain Isolation Testing**
Each domain is tested in complete isolation:

```typescript
// combat/composables.spec.ts
describe('useCombat', () => {
  it('should process combat events', () => {
    const mockIsMyActor = vi.fn(() => false);
    const mockSendCommand = vi.fn();

    app.runWithContext(() => {
      const combat = useCombat({
        isMyActor: mockIsMyActor,
        sendCommand: mockSendCommand
      });

      // Test domain logic in isolation
    });
  });
});
```

### 3. **Shared UI Components**
Domain-specific UI components live in `@flux/ui` and are imported by the client:

```vue
<template>
  <TacticalGrid
    :positions="combatState.positions"
    :is-current-actor="auth.isMyActor"
    @position-clicked="handleTacticalMove"
  />
</template>

<script setup lang="ts">
import { TacticalGrid } from '@flux/ui';
</script>
```

## Project Structure

### Domain Modules
Each domain follows the same structure:

```
auth/
├── composables.ts       # useAuth(), useLogin(), useCharacterSelect()
├── composables.spec.ts  # Comprehensive test coverage
└── types.ts            # Domain-internal types (not shared)
```

### Shared Resources
```
src/
├── types/              # Shared type definitions
│   ├── index.ts        # Re-exports @flux/core + client types
│   ├── client.ts       # Client-specific shared types
│   └── worldEvents.ts  # WorldEvent utilities & type guards
├── views/              # Page-level layout components
│   ├── GameView.vue    # Main game interface layout
│   └── AuthView.vue    # Authentication flow layout
└── App.vue            # Composition root
```

## Key Architectural Benefits

### 🎯 **Domain Expertise**
- Each domain can be owned by specialists
- Clear boundaries prevent accidental coupling
- Domain logic is isolated and testable

### 🧪 **Comprehensive Testing**
- Domains tested in complete isolation
- Mock dependencies injected at boundaries
- Pure function testing for composables

### 🔧 **Maintainable Evolution**
- Domains evolve independently
- Refactoring one domain doesn't break others
- Clear dependency contracts

### 🎮 **Game-Centric Design**
- Architecture mirrors game's conceptual domains
- WorldEvent-driven information flow
- Real-time reactive gameplay

### 🚀 **Scalable Development**
- Multiple developers can work on different domains
- Shared UI components ensure consistency
- Monorepo enables code sharing across tools

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Type checking
npm run type-check
```

### Development Commands
```bash
# Domain-specific testing
npm run test auth/
npm run test combat/
npm run test xmpp/

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture Decisions

### Why Vue Over React?
- **Reactive System**: Perfect match for WorldEvent-driven architecture
- **Composition API**: Natural fit for domain-driven composables
- **Performance**: Efficient reactivity for real-time game events

### Why Domain-Driven Organization?
- **Game Complexity**: MUDs have distinct, complex game systems
- **Team Scalability**: Different experts can own different domains
- **Maintainability**: Clear boundaries prevent architectural drift

### Why Composition Root Pattern?
- **Testability**: Each domain can be tested in isolation
- **Flexibility**: Easy to rewire domain interactions
- **Clarity**: All cross-domain knowledge in one place

### Why Shared UI Components?
- **Consistency**: Same components across client and tools
- **Reusability**: Combat sandbox uses same UI as main client
- **Maintainability**: Single source of truth for game UI

## Contributing

### Adding New Domains
1. Create domain folder: `src/newdomain/`
2. Implement `composables.ts` with clear API
3. Add comprehensive test coverage
4. Wire into composition root (`App.vue`)
5. Update shared types if needed

### Domain Development Guidelines
- **No cross-domain imports** of composables
- **Inject dependencies** at composition root
- **Use shared types** from `@/types`
- **Test in isolation** with mocked dependencies
- **Follow Vue 3 best practices** (Composition API, `<script setup>`)

### Testing Requirements
- **100% composable coverage** for domain logic
- **Isolated testing** with dependency injection
- **Vue app context** for reactivity testing
- **Mock external dependencies** (XMPP, HTTP, etc.)

## Related Projects

- **`@flux/core`** - Domain types and pure game logic
- **`@flux/ui`** - Shared Vue components for game domains
- **`@flux/tools`** - Development tools (Combat Sandbox, World Generator)
- **`flux-server`** - Game server with WorldEvent generation

This client represents a sophisticated approach to building complex, real-time game interfaces with maintainable, domain-driven architecture.
