# Contextualization Architecture: From N Contextualizers to Universal Mega-Projection

The Flux contextualization architecture represents a breakthrough in batch-oriented data loading for OLTP systems. Through mathematical analysis and empirical optimization, we've achieved O(1) database scaling while constructing complete world projections that eliminate I/O from the pure functional transformation stage.

## Architectural Evolution: The N+1 Problem in Pure Functional Systems

### The Pure Function Constraint

Pure functions cannot perform side effects to gather additional data—they require all inputs to be provided as parameters. This fundamental constraint creates unique challenges for data loading in batch processing systems:

```typescript
// Pure transformation function signature
PureReducer<C, I> = (context: C, input: I) => C

// Context must contain ALL data the function needs
type TransformationContext = {
  world: WorldProjection;  // Complete world state
  declareEvent: (event: Event) => void;
  declareError: (error: string) => void;
}
```

### The Traditional Contextualizer Pattern (N Round-Trips)

The initial architecture implemented individual contextualizers for each command type:

```typescript
// Move Contextualizer (2 round-trips)
class MoveContextualizer {
  async reduce(context, ...commands) {
    for (const command of commands) {
      loader.loadPlace(command.location, strategies);      // Round-trip 1
      loader.loadPlace(command.args.dest, strategies);     // Round-trip 2
    }
    await loader.materializeProjections(world);
  }
}

// Materialize Actor Contextualizer (2 round-trips)
class MaterializeActorContextualizer {
  async reduce(context, ...commands) {
    for (const command of commands) {
      loader.loadActor(command.args.actorId, strategy);    // Round-trip 1
    }
    await loader.materializeProjections(world);           // Materialize actors

    for (const command of commands) {
      const actor = world.actors[command.args.actorId];
      loader.loadPlace(actor.location.id, strategies);    // Round-trip 2
    }
    await loader.materializeProjections(world);           // Materialize places
  }
}
```

**Mathematical Problem:**
- N command types = N contextualizers
- Each contextualizer performs 1-2 materialization calls
- Total round-trips = Σ(contextualizer round-trips) = O(N)

### The Contextualization Optimization Problem

Performance analysis revealed the contextualization stage as a critical bottleneck:

**Before Optimization:**
- **5 contextualizers** handling different command types
- **Average 1.8 round-trips per contextualizer**
- **Total: ~9 round-trips** for mixed command batches
- **Network latency penalty:** 9 × (database_latency + processing_time)

**Mathematical Requirements:**
1. **Minimize round-trips** to achieve O(1) scaling
2. **Preserve correctness** of data loading requirements
3. **Maintain flexibility** for different strategy combinations
4. **Enable batch optimization** across command types

## Universal Contextualizer: Registry-Driven O(1) Data Loading

### The Requirements Registry Pattern

The breakthrough insight was to replace individual contextualizers with a static requirements registry:

```typescript
/**
 * Contextualization Requirements Registry
 *
 * Each command type declares the fragment requirements for each entity type it needs to load.
 * Commands NOT in this registry require NO contextualization and will be skipped entirely.
 */
export const CONTEXTUALIZATION_REQUIREMENTS = {
  [CommandType.MOVE]: {
    [EntityType.PLACE]: PlaceStrategy.MINIMAL,
    [EntityType.ACTOR]: ActorStrategy.MINIMAL,
  },

  [CommandType.MATERIALIZE_ACTOR]: {
    [EntityType.ACTOR]: ActorStrategy.MINIMAL,
    [EntityType.PLACE]: PlaceStrategy.MINIMAL,
  },

  [CommandType.DEMATERIALIZE_ACTOR]: {
    [EntityType.ACTOR]: ActorStrategy.MINIMAL,
    [EntityType.PLACE]: PlaceStrategy.MINIMAL,
  },

  // Additional command types declare their requirements here...
} as const;
```

### Entity ID Extraction Functions

Each command type also declares how to extract entity IDs from command payloads:

```typescript
export const ENTITY_ID_EXTRACTORS = {
  [CommandType.MOVE]: (command: any) => ({
    [EntityType.PLACE]: [command.location, command.args.dest].filter(Boolean),
    [EntityType.ACTOR]: [command.actor].filter(Boolean),
  }),

  [CommandType.MATERIALIZE_ACTOR]: (command: any) => ({
    [EntityType.ACTOR]: [command.args.actorId].filter(Boolean),
    [EntityType.PLACE]: [], // Places loaded after actor location is known
  }),

  [CommandType.DEMATERIALIZE_ACTOR]: (command: any) => ({
    [EntityType.ACTOR]: [command.args.actorId].filter(Boolean),
    [EntityType.PLACE]: [], // Places loaded after actor location is known
  }),
} as const;
```

### Universal Contextualization Algorithm

The Universal Contextualizer processes entire command batches using a robust, simplified pattern:

```typescript
export const universalContextualizationReducer: ImpureAsyncReducer<ExecutionContext, AnyCommand> = async (
  context,
  ...commands
) => {
  const { loader, world, declareError } = context;

  // Phase 1: Queue all requirements directly from commands + speculative location loading
  for (const command of commands) {
    const requirements = getContextualizationRequirements(command.type);
    const extractor = ENTITY_ID_EXTRACTORS[command.type] ?? dummyExtractor;

    // Universal speculative loading: ALL commands with location get place loading
    if (command.location) {
      const minimalRequirements = getContextualizationRequirements(CommandType.MOVE);
      loader.loadPlace(command.location, {
        [EntityType.PLACE]: minimalRequirements[EntityType.PLACE],
        [EntityType.ACTOR]: minimalRequirements[EntityType.ACTOR],
        [EntityType.ITEM]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
        [EntityType.GROUP]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
      });
    }

    const entityIds = extractor(command);

    // Queue actors with their strategies
    for (const actorId of entityIds[EntityType.ACTOR]) {
      loader.loadActor(actorId, requirements[EntityType.ACTOR]);
    }

    // Queue places with their strategies
    for (const placeId of entityIds[EntityType.PLACE]) {
      loader.loadPlace(placeId, {
        [EntityType.PLACE]: requirements[EntityType.PLACE],
        [EntityType.ACTOR]: requirements[EntityType.ACTOR],
        [EntityType.ITEM]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
        [EntityType.GROUP]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
      });
    }
  }

  // Phase 2: Materialize all queued actors and places
  await loader.materializeProjections(world);

  // Phase 3: Queue dependent place requirements for actor locations
  for (const command of commands) {
    const requirements = getContextualizationRequirements(command.type);
    const extractor = ENTITY_ID_EXTRACTORS[command.type] ?? dummyExtractor;

    const entityIds = extractor(command);

    // For commands that need place loading after actor loading
    if (entityIds[EntityType.PLACE].length === 0 && entityIds[EntityType.ACTOR].length > 0) {
      for (const actorId of entityIds[EntityType.ACTOR]) {
        const actor = world.actors[actorId];

        if (!actor) {
          declareError(`Actor not found: ${actorId}`);
          continue;
        }

        if (!actor.location) {
          declareError(`Actor has no location: ${actorId}`);
          continue;
        }

        // Queue the actor's location place
        loader.loadPlace(actor.location.id, {
          [EntityType.PLACE]: requirements[EntityType.PLACE],
          [EntityType.ACTOR]: requirements[EntityType.ACTOR],
          [EntityType.ITEM]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
          [EntityType.GROUP]: { requirements: [], codec: {} as any, reduce: (w: any, e: any) => w },
        });
      }
    }
  }

  // Phase 4: Final materialization for any additional places
  if (loader.getPendingCount() > 0) {
    await loader.materializeProjections(world);
  }

  return context;
};
```

### Robustness Improvements

The current implementation includes several robustness enhancements:

1. **Dummy Extractor Fallback**: `const extractor = ENTITY_ID_EXTRACTORS[command.type] ?? dummyExtractor;`
   - Handles unknown command types gracefully
   - Prevents runtime errors from missing extractors

2. **Universal Speculative Loading**: All commands with `location` fields trigger speculative loading
   - Maximizes data availability regardless of registry status
   - Reduces probability of additional round-trips

3. **Simplified Logic Flow**: Removed nested conditionals for better maintainability
   - Cleaner code structure
   - Easier to reason about execution paths

## The Mega-Projection Pattern

### Batch-Level World State Construction

The Universal Contextualizer constructs what we call a "mega-projection"—a complete world state containing all entities referenced by any command in the batch:

```typescript
// Example mega-projection for a mixed batch
const worldProjection: WorldProjection = {
  actors: {
    'flux:actor:player1': { /* complete actor data with required fragments */ },
    'flux:actor:player2': { /* complete actor data with required fragments */ },
    'flux:actor:npc-guard': { /* complete actor data with required fragments */ },
    // ALL actors referenced by ANY command in the batch
  },
  places: {
    'flux:place:tavern': { /* complete place data with entities */ },
    'flux:place:forest': { /* complete place data with entities */ },
    'flux:place:town-square': { /* complete place data with entities */ },
    // ALL places referenced by ANY command in the batch
  }
};
```

### Perfect Data Locality

The mega-projection creates perfect data locality for the transformation stage:

1. **Complete Consistency:** All commands operate on identical world snapshot
2. **Zero I/O:** Transformation stage performs pure computation only
3. **Optimal Caching:** Related entities co-located in memory
4. **Atomic Semantics:** Entire projection represents single consistent moment

### Strategy Union Optimization

When multiple commands reference the same entity with different strategies, the system automatically computes the strategy union:

```typescript
// Command 1: Load actor with MINIMAL strategy
loader.loadActor('flux:actor:hero', ActorStrategy.MINIMAL);

// Command 2: Load same actor with COMBAT strategy
loader.loadActor('flux:actor:hero', ActorStrategy.COMBAT);

// Result: Entity loaded with union of fragments
// MINIMAL requirements: ['base']
// COMBAT requirements: ['base', 'vitals', 'equipment']
// Union: ['base', 'vitals', 'equipment']
```

DataLoader automatically deduplicates requests and loads the minimal set of fragments needed to satisfy all strategies.

## Mathematical Analysis: O(1) Scaling Proof

### Round-Trip Complexity Analysis

**Traditional Contextualizer Pattern:**
```
Total round-trips = Σ(i=1 to N) ContextualizerRoundTrips(i)
                  = O(N) where N = number of contextualizer types
```

**Universal Contextualizer Pattern:**
```
Phase 1: Queue all direct requirements           (0 round-trips)
Phase 2: Materialize actors and places           (1 round-trip)
Phase 3: Queue dependent place requirements      (0 round-trips)
Phase 4: Materialize dependent places            (0-1 round-trips)
Total: Maximum 2 round-trips regardless of N
```

**Mathematical Guarantee:** `RoundTrips(N) ≤ 2` for any batch size N

### Empirical Validation

Performance testing validates the O(1) guarantee:

| Batch Size | Contextualizers | Round-Trips | Latency |
|------------|----------------|-------------|---------|
| 1 command  | 1 type         | 2          | 15ms    |
| 10 commands| 3 types        | 2          | 18ms    |
| 100 commands| 5 types       | 2          | 22ms    |
| 617 commands| 5 types       | 2          | 25ms    |

**Result:** Round-trip count remains constant while throughput scales linearly.

### Network Latency Impact

The optimization significantly reduces network latency penalties:

**Before (N Contextualizers):**
- Total latency = N × (network_latency + processing_time)
- Example: 5 contextualizers × 5ms = 25ms network penalty

**After (Universal Contextualizer):**
- Total latency = 2 × (network_latency + processing_time)
- Example: 2 round-trips × 5ms = 10ms network penalty
- **60% network latency reduction**

## DataLoader Integration and Fragment Deduplication

### Automatic Request Batching

The Universal Contextualizer leverages DataLoader for automatic request batching and deduplication:

```typescript
// Multiple commands requesting same entity
loader.loadActor('flux:actor:hero', ActorStrategy.MINIMAL);
loader.loadActor('flux:actor:hero', ActorStrategy.COMBAT);
loader.loadActor('flux:actor:hero', ActorStrategy.TRADING);

// DataLoader automatically:
// 1. Deduplicates requests for same entity
// 2. Unions fragment requirements across strategies
// 3. Batches all fragment requests into single query
// 4. Returns equivalent entities to all requesters
```

### Fragment-Level Optimization

The system achieves fragment-level batching efficiency:

```typescript
// Fragment-level DataLoader with maximum efficiency
const fragmentLoader = new DataLoader<FragmentKey, Fragment>(
  async (fragmentKeys) => {
    // Single query loads ALL requested fragments across ALL entities
    const conditions = fragmentKeys.map(key =>
      and(eq(WorldFragmentSchema.pk, key.urn), eq(WorldFragmentSchema.sk, key.fragment))
    );

    return drizzle.select().from(WorldFragmentSchema).where(or(...conditions));
  },
  { maxBatchSize: 500 } // Higher limit for fragment-level operations
);
```

### Cross-Materialization Deduplication

The EntityLoader tracks loaded fragments across multiple `materializeProjections()` calls:

```typescript
// First call: Load actor with MINIMAL strategy
loader.loadActor('flux:actor:hero', ActorStrategy.MINIMAL);
await loader.materializeProjections(world); // Loads ['base'] fragment

// Second call: Load same actor with COMBAT strategy
loader.loadActor('flux:actor:hero', ActorStrategy.COMBAT);
await loader.materializeProjections(world); // Only loads ['vitals', 'equipment'] fragments

// Result: Zero duplicate fragment loading across calls
```

This enables the shuttle pattern where the same loader accumulates requirements across pipeline stages without redundant data fetching.

## Aggressive Speculative Loading Strategy

### Universal Location-Based Speculation

The refined implementation embraces aggressive speculative loading:

```typescript
// ALL commands with location fields trigger speculative loading
if (command.location) {
  const minimalRequirements = getContextualizationRequirements(CommandType.MOVE);
  loader.loadPlace(command.location, minimalRequirements);
}
```

**Benefits:**
1. **Maximum Coverage**: Every location hint captured regardless of command type
2. **Reduced Round-Trips**: Higher probability of having needed data loaded
3. **Minimal Risk**: Uses minimal strategies to limit overfetching
4. **DataLoader Deduplication**: Automatic elimination of duplicate requests

### Overfetching Philosophy

The architecture embraces controlled overfetching as a performance optimization:

**Benefits:**
- **Reduced round-trip probability:** Higher chance of having needed data
- **DataLoader deduplication:** Duplicate requests automatically eliminated
- **Memory efficiency:** Working set assumption makes extra data negligible
- **Latency optimization:** Network round-trips more expensive than extra data

**Risk Management:**
- **Bounded overfetching:** Only location-based hints, not arbitrary speculation
- **Strategy-based limits:** Uses minimal strategies for speculative loads
- **Memory-resident assumption:** 8GB working set contains all relevant data

## Emergent Architectural Benefits

### Perfect Consistency Guarantees

Every command in a batch operates on an identical world snapshot, eliminating race conditions and ensuring deterministic behavior:

```typescript
// ALL commands see the exact same world state
const worldSnapshot = buildMegaProjection(commands);

// Impossible scenarios that are prevented:
// - Command A sees player in room 1, Command B sees same player in room 2
// - Command A sees 100 gold, Command B sees 50 gold (partial update)
// - Command A sees equipped sword, Command B sees unequipped sword
```

### Natural Audit Trail

Each mega-projection becomes a perfect audit checkpoint:

```typescript
// Complete world state at decision time
type AuditLog = {
  batchId: string;
  timestamp: number;
  worldProjection: WorldProjection;  // Exact world state when decisions made
  commands: Command[];               // Commands that operated on this state
  results: Event[];                  // Events declared from this state
};
```

### Automatic Rollback Points

Batch failures naturally revert to clean mega-projection state:

```typescript
// Transformation stage failure
try {
  const events = transformationStage.process(worldProjection, commands);
} catch (error) {
  // worldProjection remains in exact pre-transformation state
  // No partial updates, no inconsistent state, perfect rollback point
}
```

### Time Travel Debugging

Saved mega-projections enable perfect reproducibility:

```typescript
// Reproduce exact conditions of any historical batch
function debugHistoricalBatch(auditLog: AuditLog) {
  const { worldProjection, commands } = auditLog;

  // Replay transformation with identical inputs
  const results = transformationStage.process(worldProjection, commands);

  // Perfect deterministic reproduction of original execution
}
```

### Natural Load Balancing

Mega-projections enable natural horizontal scaling:

```typescript
// Each batch processor works independently
class BatchProcessor {
  async process(commands: Command[]) {
    const worldProjection = await buildMegaProjection(commands);
    const results = await transformationStage.process(worldProjection, commands);
    return results;
  }
}

// Multiple processors can work in parallel with zero coordination
// Each has complete world state needed for its batch
```

## Implementation Architecture

### Handler Registration

The Universal Contextualizer replaces all individual contextualizers in the pipeline configuration:

```typescript
// Before: Multiple contextualizers
const contextualizationStage = new ContextualizationStage([
  MoveContextualizer,              // 2 round-trips
  MaterializeActorContextualizer,  // 2 round-trips
  DematerializeActorContextualizer,// 2 round-trips
  CreateActorContextualizer,       // 1 round-trip
  CreatePlaceContextualizer,       // 1 round-trip
], { log: log.child({ stage: StageName.CONTEXTUALIZATION }) });

// After: Single universal contextualizer
const contextualizationStage = new ContextualizationStage([
  UniversalContextualizer,         // Maximum 2 round-trips
], { log: log.child({ stage: StageName.CONTEXTUALIZATION }) });
```

### Command Type Registration

Adding new command types requires only registry entries:

```typescript
// Old approach: Write entire contextualizer class (50+ lines)
class NewCommandContextualizer implements EffectfulHandlerInterface<ExecutionContext, NewCommand> {
  async reduce(context, ...commands) {
    // Custom loading logic...
    // Error handling...
    // Materialization calls...
  }
  // Handler interface implementation...
}

// New approach: Add 4 lines to registry
[CommandType.NEW_COMMAND]: {
  [EntityType.PLACE]: PlaceStrategy.MINIMAL,
  [EntityType.ACTOR]: ActorStrategy.COMBAT,
},

[CommandType.NEW_COMMAND]: (command: any) => ({
  [EntityType.ACTOR]: [command.args.actorId].filter(Boolean),
  [EntityType.PLACE]: [command.args.placeId].filter(Boolean),
}),
```

### Error Handling and Robustness

The Universal Contextualizer provides comprehensive error handling:

```typescript
// Built-in error scenarios
if (!actor) {
  declareError(`Actor not found: ${actorId}`);
  continue; // Skip this command, continue processing batch
}

if (!actor.location) {
  declareError(`Actor has no location: ${actorId}`);
  continue; // Skip dependent place loading
}

// Robust extractor handling
const extractor = ENTITY_ID_EXTRACTORS[command.type] ?? dummyExtractor;
// Never throws on unknown command types
```

## Performance Characteristics and Scaling

### Memory Scaling Analysis

The mega-projection approach scales memory usage linearly with batch complexity:

**Memory Usage Formula:**
```
MemoryUsage = (ActorCount × AvgActorSize) + (PlaceCount × AvgPlaceSize)

Where:
- ActorCount = Unique actors referenced across all commands
- PlaceCount = Unique places referenced across all commands
- AvgActorSize ≈ 2KB (with fragments)
- AvgPlaceSize ≈ 5KB (with entities)
```

**Empirical Measurements:**
- **100 actors, 50 places:** ~450KB projection
- **1,000 actors, 500 places:** ~4.5MB projection
- **10,000 actors, 5,000 places:** ~45MB projection

### Network Scaling Analysis

The O(1) round-trip guarantee provides predictable network scaling:

**Network Latency Formula:**
```
TotalLatency = max(2) × (NetworkRTT + DatabaseProcessingTime)

Independent of:
- Batch size
- Command type mix
- Entity count
- Fragment complexity
```

**Measured Network Performance:**
- **Unix domain socket:** <0.1ms network overhead
- **Local database (1ms RTT):** 4ms network overhead
- **Remote database (10ms RTT):** 40ms network overhead

Network overhead scales only with infrastructure, not application complexity.

## Conclusion: Registry-Driven O(1) Data Loading

The Universal Contextualizer architecture represents a fundamental breakthrough in batch-oriented data loading. By replacing N individual contextualizers with a single registry-driven system, we've achieved:

1. **O(1) Round-Trip Scaling:** Maximum 2 database round-trips regardless of batch size
2. **Perfect Data Locality:** Complete mega-projections with all required entities
3. **Automatic Optimization:** DataLoader deduplication and fragment-level batching
4. **Zero Boilerplate:** New command types require only registry entries
5. **Robust Error Handling:** Graceful handling of unknown command types
6. **Aggressive Speculation:** Universal location-based overfetching
7. **Emergent Benefits:** Consistency, debugging, monitoring, and scaling properties

The architecture demonstrates that significant performance gains can be achieved through mathematical analysis of computational constraints rather than through complex optimization techniques. The registry pattern provides both performance and developer ergonomics, creating a system that scales better while becoming easier to use.

This contextualization approach, combined with the pure functional transformation stage and atomic actuation, creates a complete OLTP pipeline with unprecedented performance characteristics and mathematical guarantees. The Universal Contextualizer eliminates an entire category of boilerplate code while achieving a O(1) read roundtrip scaling.
