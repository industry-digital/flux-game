# Entity Projection Architecture Design Document

## Overview

This document describes the Entity Projection system for the Flux game engine. **Entities are ephemeral projections** - sparse, temporary assemblies of fragments that exist only during game logic execution.

Game logic operates on complete entities, but these entities are not stored. They are assembled from persistent fragments, used for computation, then decomposed back into fragments. Only changed fragments are persisted.

The system implements fragment-based storage with request-based projection and batch materialization.

## Table of Contents

1. [Storage Strategy](#storage-strategy)
2. [Entity Projection Lifecycle](#entity-projection-lifecycle)
3. [Projection Strategy](#projection-strategy)
4. [Performance Architecture](#performance-architecture)
5. [Type Safety & Error Handling](#type-safety--error-handling)
6. [Integration Patterns](#integration-patterns)

---

## Storage Strategy

### Fragment-Based Persistent Storage

The Entity Projection system stores entity data as discrete fragments in the `world_fragment` table. **Entities themselves are never stored** - they exist only as temporary projections assembled from these fragments.

#### Core Storage Principles

1. **Fragments as Source of Truth**: All persistent entity data lives as fragments in the `world_fragment` table
2. **Fragment Atomicity**: Each fragment represents a cohesive aspect of an entity's state
3. **Ephemeral Entities**: Complete entities exist only during game logic execution as assembled projections
4. **Selective Persistence**: Only fragments that change during entity processing are written back to storage
5. **Performance Optimization**: Only required fragments are loaded for specific projections

#### Database Schema

```sql
-- world_fragment table structure
CREATE TABLE world_fragment (
  pk    varchar NOT NULL,  -- Entity URN (e.g., "character:uuid")
  sk    varchar NOT NULL,  -- Fragment name (e.g., "vitals", "inventory")
  data  jsonb NOT NULL, -- Fragment data as key-value pairs
  gsi_pk varchar NOT NULL, -- GSI partition key
  gsi_sk varchar NOT NULL, -- GSI sort key
  PRIMARY KEY (pk, sk)
);

-- GSI1 for place-based entity queries
CREATE INDEX gsi1 ON world_fragment (gsi_pk, gsi_sk);
```

#### Fragment Types by Entity

**Character Fragments:**
- `_` (BASE) - Core identity, name, type
- `vitals` - Health, mana, status effects
- `stats` - Attributes, skills, levels
- `inventory` - Items, quantities, organization
- `equipment` - Worn/wielded items
- `social` - Relationships, reputation, subscriptions
- `progression` - Experience, achievements
- `preferences` - Settings, UI state

**Place Fragments:**
- `_` (BASE) - Core identity, exits, description

**Item/Monster/Group Fragments:**
- `_` (BASE) - Core identity (extensible for future fragments)

### Storage Advantages

1. **Selective Loading**: Load only needed fragments
2. **Cache Efficiency**: Cache fragments independently
3. **Write Optimization**: Persist only changed fragments
4. **Schema Evolution**: Add new fragments without affecting existing data
5. **Ephemeral Entities**: No entity storage overhead

---

## Entity Projection Lifecycle

### The Ephemeral Entity Model

Entities in this architecture follow a **project-compute-decompose lifecycle**:

1. **Projection Phase**: Fragments are assembled into contextually complete, hydrated entities
2. **Computation Phase**: Game logic operates on well-formed entities as if they were permanent objects
3. **Decomposition Phase**: Entities are broken down into their constituent fragments
4. **Persistence Phase**: Only fragments that changed during computation are stored

### Fragment Assembly & Disassembly

The projection lifecycle is managed by **Entity Codecs** that handle bidirectional transformation between fragments and ephemeral entities.

```
Fragment[] → assemble() → Entity → compute() → disassemble() → Fragment[]
```

#### Entity Codec Interface

```typescript
export type EntityCodec<TEntity extends Entity> = {
  assemble: (
    fragments: Fragment<TEntity['type']>[],
    requiredFragments?: FragmentForEntityType<TEntity['type']>[]
  ) => TEntity;
  disassemble: (entity: TEntity) => Fragment<TEntity['type']>[];
};
```

#### Assembly Process (Projection Phase)

1. **Fragment Validation**: Verify all required fragments are present
2. **Data Extraction**: Extract data from each fragment using dotpath utilities
3. **Entity Construction**: Merge fragment data into complete entity structure
4. **Type Enforcement**: Ensure projected entity matches expected type
5. **Hydration**: Provide entity to game logic

Implementation Note: The world projection is kept as a plain object throughout the pipeline. Fragment mutations are declared explicitly in the Planning stage using dedicated mutation hooks, providing precise control over which fragments are updated.

#### Fragment Mutation Process (Planning Phase)

1. **Entity Analysis**: Game logic operates on complete entity projections
2. **Explicit Mutation Declaration**: Planning stage handlers declare specific fragment mutations using `useWorldFragmentMutations()` and `useWorldEntityMutations()`
3. **Fragment Operation Queuing**: Only explicitly declared fragment operations are queued for persistence
4. **Selective Persistence**: Store only fragments with explicit mutation declarations

#### Dotpath Serialization

Fragment data uses **dotpath notation** for flexible key-value storage:

```typescript
// Entity property: character.vitals.health.current = 100
// Fragment data: { "vitals.health.current": 100 }

// Complex nested structures are flattened:
// character.inventory[0].id = "sword-123"
// character.inventory[0].quantity = 1
// Becomes: {
//   "inventory.0.id": "sword-123",
//   "inventory.0.quantity": 1
// }
```

### Fail-Fast Error Handling

The projection system implements fail-fast semantics:

- **Missing Required Fragments**: Immediate error during projection, no partial assembly
- **Invalid Fragment Data**: Validation errors propagate immediately
- **Type Mismatches**: Compile-time and runtime type checking
- **Corrupt Data**: Clear error messages with entity context
- **Mutation Declaration Failures**: Invalid fragment mutation declarations abort persistence

---

## Projection Strategy

### Scenario-Based Fragment Loading

The projection strategy loads only the fragments needed to create specific entity projections for different game scenarios.

#### Projection Strategy Components

```typescript
export type ProjectionStrategy<TEntity extends Entity> = {
  /** The required fragments to create the projection */
  requirements: FragmentForEntityType<TEntity['type']>[];  // Required fragments
  codec: EntityCodec<TEntity>;                             // Assembly/disassembly
  reduce: WorldProjectionReducer<WorldProjection, TEntity>; // World state integration
};
```

#### Character Projection Strategies

**MINIMAL Strategy:**
- Fragments: `_` (BASE only)
- Use Case: Basic entity references

**COMBAT Strategy:**
- Fragments: `_`, `vitals`, `equipment`
- Use Case: Combat encounters, health/damage calculations

**TRADING Strategy:**
- Fragments: `_`, `inventory`, `social`
- Use Case: Shop interactions, trade negotiations

**SOCIAL Strategy:**
- Fragments: `_`, `social`
- Use Case: Chat, guilds, social interactions

**COMPLETE Strategy:**
- Fragments: All available fragments
- Use Case: Character sheets, admin tools

#### Scenario Strategy Sets

Strategy combinations for common game scenarios:

```typescript
export const ScenarioStrategies = {
  COMBAT: {
    [EntityType.CHARACTER]: CharacterStrategies.COMBAT,
    [EntityType.PLACE]: PlaceStrategies.COMPLETE,
    [EntityType.ITEM]: ItemStrategies.MINIMAL
  },
  TRADING: {
    [EntityType.CHARACTER]: CharacterStrategies.TRADING,
    [EntityType.PLACE]: PlaceStrategies.COMPLETE,
    [EntityType.ITEM]: ItemStrategies.COMPLETE
  }
  // ... additional scenarios
};
```

#### World State Integration

Each projection strategy includes a reducer function that integrates entity projections into the world state:

```typescript
reduce: (world: WorldProjection, character: Character): WorldProjection => ({
  ...world,
  actors: {
    ...world.actors,
    [character.id]: character
  }
})
```

---

## Performance Architecture

### Request-Based Projection Pattern

The Entity Projection system implements a request-response pattern with batching:

1. **Request Phase**: Accumulate entity projection requests with strategies
2. **Materialization Phase**: Execute batch queries for fragments
3. **Assembly Phase**: Transform fragments into entities
4. **Integration Phase**: Apply world state reducers

### Cross-Stage Entity Accumulation

The EntityLoader accumulates entity projection requests across multiple pipeline stages, then materializes them with automatic request deduplication:

```typescript
// Stage 1: Contextualization
context.loader.loadEntity('flux:char:bob', CharacterStrategies.MINIMAL);
await context.loader.materializeProjections(world);

// Stage 2: Transformation
context.loader.loadEntity('flux:char:bob', CharacterStrategies.COMBAT); // Same entity!
context.loader.loadPlace(placeUrn, placeStrategies);
await context.loader.materializeProjections(world);
```

**Automatic Deduplication Benefits:**

- **Entity-Level Deduplication**: Multiple requests for the same entity URN are automatically merged
- **Fragment Union**: DataLoader intelligently combines fragment requirements (MINIMAL + COMBAT = union of fragments)
- **Single Database Query**: Despite multiple `loadEntity()` calls, only one optimized query executes
- **Cross-Stage Optimization**: Later stages benefit from entities already loaded by earlier stages
- **Zero Configuration**: Deduplication happens automatically without handler coordination

This cross-stage accumulation eliminates redundant database operations.

### Database Query Optimization

#### Single-Query Batching

All fragment requests are consolidated into a single database query:

```sql
SELECT pk, sk, data FROM world_fragment
WHERE (pk = ? AND sk = ?) OR (pk = ? AND sk = ?) OR ...
```

#### Fragment Deduplication

- Identical fragment requests are automatically deduplicated
- Directly reduces the number of database round-trips
- Maintains request context for proper entity assembly

#### Performance Characteristics

- **Maximum 3 Database Round-Trips**: Request collection, fragment loading, explicit fragment mutations
- **Memory Efficient**: Ephemeral entities with automatic cleanup, request queuing
- **Direct Mutation**: World projection is mutated directly, avoiding object creation overhead

### Caching Strategy

The fragment-based approach enables sophisticated caching:

- **Fragment-Level Caching**: Cache individual fragments independently
- **Strategy-Based Cache Keys**: Different projections can share cached fragments
- **Invalidation Precision**: Update only explicitly mutated fragments based on declared operations
- **Projection Efficiency**: Cached fragments accelerate ephemeral entity assembly

---

## Type Safety & Error Handling

### Compile-Time Type Safety

The system enforces type safety at multiple levels:

#### Fragment Type Mapping

```typescript
export type FragmentForEntityType<T extends EntityType> =
  T extends EntityType.CHARACTER ? CharacterFragmentName :
  T extends EntityType.PLACE ? PlaceFragmentName :
  T extends EntityType.ITEM ? ItemFragmentName :
  never;
```

#### Strategy Type Constraints

```typescript
export type ProjectionStrategy<TEntity extends Entity> = {
  requirements: FragmentForEntityType<TEntity['type']>[];
  codec: EntityCodec<TEntity>;
  reduce: WorldProjectionReducer<WorldProjection, TEntity>;
};
```

### Runtime Error Handling

#### Fail-Fast Assembly

- **Missing Fragments**: Immediate error with fragment context
- **Invalid Data**: Clear error messages with entity and fragment details
- **Type Mismatches**: Runtime validation with specific failure points

#### Error Context Preservation

```typescript
throw new Error(
  `Failed to assemble ${entityType} entity ${urn}: missing required fragments [${missing.join(', ')}]. ` +
  `Available fragments: [${available.join(', ')}]`
);
```

#### Request Cleanup

- Automatic cleanup of pending requests on any error
- Prevents memory leaks and inconsistent state
- Clear error propagation to calling code

---

## Integration Patterns

### Pipeline Integration

The EntityLoader integrates seamlessly with the pipeline execution model through the ExecutionContextModel, enabling handlers to queue entity requests without immediate execution:

```typescript
// In any pipeline stage handler
context.loader?.loadEntity(urn, strategy);
context.loader?.loadPlace(placeUrn, strategies);

// Pipeline handles materialization between stages
await context.resolveLoaders?.();
```

This provides stage-agnostic entity loading with automatic batching optimization. Handlers can focus on their domain logic without coordinating entity loading requirements with other stages.

### Entity Loader Factory

```typescript
export const createEntityLoader = (appContext: ApplicationContext): EntityLoader => {
  return new EntityLoaderImpl(appContext);
};
```

### Usage in Contextualization Handlers

```typescript
// Request entities with appropriate strategies
loader.loadEntity(characterUrn, CharacterStrategies.COMBAT);
loader.loadPlace(placeUrn, ScenarioStrategies.COMBAT);

// Materialize all requests in single batch
await loader.materializeProjections(worldProjection);

// Entities are now available in world state via direct mutation
```

### World State Integration

The projection system seamlessly integrates with existing world state management:

1. **Request Phase**: Handlers specify needed entities and strategies
2. **Loading Phase**: Entity Loader batches and executes queries
3. **Integration Phase**: Reducers directly mutate world projection
4. **Handler Execution**: Handlers operate on complete world state

### Extension Points

The architecture provides clear extension points:

- **New Fragment Types**: Add fragments to existing entity types
- **New Entity Types**: Implement codecs and projection strategies
- **Custom Strategies**: Create scenario-specific ephemeral entity projection strategies
- **Alternative Storage**: Implement EntityCodec for different fragment storage backends

---

## Conclusion

The Entity Projection architecture provides a foundation for entity management in the Flux game engine. The **ephemeral entity model** separates computational objects from storage - entities exist only as temporary projections during game logic execution.

Key architectural characteristics include:

- **Flexibility**: Scenario-based fragment loading
- **Type Safety**: Compile-time and runtime type checking
- **Reliability**: Fail-fast error handling
- **Extensibility**: Clear patterns for adding new entities and projection strategies
- **Efficiency**: Only explicitly mutated fragments are persisted

The fragment-based storage approach, combined with ephemeral entity projections and request-based loading, creates a system where game logic operates on complete entities while maintaining storage efficiency. Entities are assembled from fragments, operate on world state during computation, with explicit fragment mutations declared in the Planning stage for precise persistence control.
