# @flux/tools

A collection of development and testing tools for the Flux game engine, built with React and TypeScript.

## Architecture Overview

This package follows functional programming principles with dependency injection patterns, emphasizing pure functions, immutable state, and type safety throughout.

### Core Architectural Patterns

#### 1. **Composition Root Pattern**
The main application components serve as composition roots where all dependencies are created and injected:

```typescript
// CombatTool.tsx - Composition root
export function createCombatTool(deps: CombatToolDependencies = DEFAULT_DEPS) {
  return function CombatTool() {
    // Create shared context at the root
    const context = createTransformerContext();

    // Inject context into all hooks
    const actors = useCombatActors(context, scenarioData, placeId);
    const session = useCombatSession(context, placeId);
    // ...
  };
}
```

#### 2. **Dependency Injection for Hooks**
All hooks accept their dependencies as parameters, following the pattern `(context, ...params, deps?)`:

```typescript
export function useCombatActors(
  context: TransformerContext,     // Shared context (first parameter)
  scenarioData: CombatScenarioData, // Domain data
  placeId: PlaceURN,              // Configuration
  deps: CombatActorsDependencies = DEFAULT_DEPS // Injectable dependencies
): UseCombatActorsResult
```

#### 3. **Pure Functional State Management**
State mutations are handled through pure functions with immutable updates:

```typescript
const addOptionalActor = useCallback((name: OptionalActorName, onSessionAdd?) => {
  const actorId = getActorIdFromName(name);
  const team = TEAM_ASSIGNMENTS[actorId];

  // Pure state update
  setScenarioData(prev => ({
    ...prev,
    actors: {
      ...prev.actors,
      [actorId]: createDefaultActorData(team)
    }
  }));

  // Side effect callback (optional)
  onSessionAdd?.(actorId, team);
}, [setScenarioData]);
```

#### 4. **Type-Safe Error Handling**
Custom error handling utilities eliminate `any` types and provide functional error management:

```typescript
// Functional error handling with Result types
const result = attempt(() => {
  session.addCombatant(actorId, sessionTeam);
});

if (!result.success) {
  // result.error is guaranteed to be Error type
  console.warn('Operation failed:', result.error.message);
}
```

### Project Structure

```
src/
├── apps/                    # Application-specific tools
│   └── combat/             # Combat simulation tool
│       ├── components/     # UI components
│       ├── hooks/         # Custom React hooks
│       └── CombatTool.tsx # Main composition root
├── shared/                 # Shared utilities
│   └── utils/             # Pure utility functions
└── App.tsx                # Root application
```

### Design Principles

#### **Functional Programming First**
- Pure functions wherever possible
- Immutable state updates
- Function composition over inheritance
- Side effects isolated and explicit

#### **Dependency Injection**
- All impure operations injected via dependencies
- Default implementations provided for production use
- Easy mocking and testing through dependency substitution
- Context/environment passed as first parameter

#### **Type Safety**
- Strict TypeScript configuration
- No `any` types in production code
- Comprehensive error handling with proper types
- Result types for operations that can fail

#### **React Hook Patterns**
- Single Responsibility Principle for hooks
- Dependency injection for testability
- Pure computation separated from side effects
- Consistent parameter ordering: `(context, data, config, deps)`

### Combat Tool Architecture

The combat tool demonstrates these patterns in a real-world application:

#### **Hook Composition**
```typescript
// Each hook has a single, focused responsibility
const scenario = useCombatScenario(defaultScenario);           // Scenario data management
const actors = useCombatActors(context, scenarioData, placeId); // Actor lifecycle
const session = useCombatSession(context, placeId);            // Session management
const combatState = useCombatState(context, session, actorId); // Command execution
const aiControl = useAiControl(context, session, actorId);     // AI automation
```

#### **Team-Based State Management**
```typescript
// Pure functions for team organization
export const getTeamActors = (scenarioData: CombatScenarioData, team: TeamName): ActorURN[] => {
  return Object.entries(scenarioData.actors)
    .filter(([, data]) => data.team === team)
    .map(([actorId]) => actorId as ActorURN);
};

// Functional state updates with callbacks for side effects
const handleAddOptionalActor = useCallback((name: OptionalActorName) => {
  addOptionalActor(name, (actorId, team) => {
    // Side effect: sync with combat session
    const sessionTeam = team === 'ALPHA' ? Team.ALPHA : Team.BRAVO;
    session.addCombatant(actorId, sessionTeam);
  });
}, [addOptionalActor, session]);
```

#### **Theming Integration**
Consistent theming using CSS custom properties from `@flux/ui`:

```typescript
// Theme-aware styling
<div style={{
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-family-heading)',
  fontSize: 'var(--font-size-lg)'
}}>
```

### Testing Philosophy

- **Pure functions are easily testable** without mocking
- **Dependency injection enables isolated unit testing**
- **Error handling utilities have comprehensive test coverage**
- **Components test public interfaces, not implementation details**

### Key Benefits

1. **Maintainability**: Clear separation of concerns and dependency injection
2. **Testability**: Pure functions and injected dependencies
3. **Type Safety**: Comprehensive TypeScript coverage with no escape hatches
4. **Reusability**: Shared utilities and consistent patterns
5. **Performance**: Immutable updates enable React optimizations

### Integration with @flux/core

The tools package integrates seamlessly with the core game engine:

- **TransformerContext**: Shared context for world state management
- **Actor Utilities**: Type-safe access to actor properties and stats
- **Combat Session API**: Direct integration with combat system
- **Intent Execution**: Universal command processing system

This architecture provides a solid foundation for building development tools that are maintainable, testable, and aligned with the broader Flux ecosystem.
