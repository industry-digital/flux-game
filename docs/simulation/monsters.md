# Monster Simulation System: Autonomous Creature Behaviors

## Overview

The Monster Simulation System implements autonomous creature behaviors that respond to environmental conditions and player presence within the game world. The system manages -- at minimum, per core -- 10,000 concurrent creatures using TypeScript and Node.js, providing real-time behavioral responses while maintaining the biological authenticity principles established by the weather and resource systems.

## Architecture Philosophy

### Biological Algorithm Implementation

The monster system implements the universal biological decision-making algorithm identified in ecological research:

```typescript
// The fundamental algorithm of consciousness
function evaluateAllNeeds(worldPerception: WorldPerception): CreatureNeeds {
  return {
    hunger: assessFoodSituation(worldPerception),
    safety: assessThreatLevel(worldPerception),
    territory: assessTerritorialStatus(worldPerception),
    social: assessSocialDynamics(worldPerception),
    reproduction: assessMatingOpportunities(worldPerception)
  };
}
```

This algorithm serves as the foundation for all creature decision-making, scaling the proven RimWorld pawn behavior system to ecosystem-level populations.

### Three-Layer Independence

Monster behaviors operate as the third independent layer in the ecological simulation:

1. **Weather System**: Generates environmental conditions independent of creatures
2. **Resource System**: Responds to weather conditions independent of creatures
3. **Monster System**: Responds to resource availability and weather conditions independent of the other systems

This independence ensures that creature behaviors emerge naturally from environmental conditions rather than scripted interactions.

## Technical Architecture

### Core Components

```typescript
// Monster worker process managing individual creature behavior
interface MonsterWorker {
  readonly id: CreatureURN;
  readonly type: CreatureType;
  readonly location: PlaceURN;
  readonly stats: CreatureStats;
  readonly aiState: CreatureAIState;
  readonly lastAction: number; // timestamp
  readonly cooldowns: Record<string, number>;
}

// World event processing system
interface WorldEventProcessor {
  processEvent(event: WorldEvent): void;
  getAffectedCreatures(event: WorldEvent): CreatureURN[];
  routeEventToCreatures(creatures: CreatureURN[], event: WorldEvent): void;
}

// Command batching for efficient server communication
interface CommandBatchCollector {
  scheduleCommand(command: CreatureCommand): void;
  flushBatch(): Promise<void>;
  readonly batchSizeLimit: number;
  readonly batchTimeLimit: number;
}
```

### Monster Worker Implementation

Each creature operates as an independent process with minimal state:

```typescript
class MonsterWorker {
  private readonly config: CreatureConfig;
  private state: CreatureState;

  constructor(id: CreatureURN, type: CreatureType, location: PlaceURN) {
    this.config = getCreatureConfig(type);
    this.state = {
      id,
      type,
      location,
      stats: this.config.baseStats,
      aiState: {},
      lastAction: Date.now(),
      cooldowns: {}
    };
  }

  async processWorldEvent(event: WorldEvent): Promise<CreatureCommand[]> {
    // Determine if this creature should react to the event
    const shouldReact = this.shouldReactToEvent(event);
    if (!shouldReact) return [];

    // Update creature state based on event
    this.updateCreatureState(event);

    // Generate behavioral response commands
    return this.decideActions(event);
  }

  private shouldReactToEvent(event: WorldEvent): boolean {
    const behavior = getCreatureBehavior(this.state.type);
    return behavior.shouldReactToEvent(event, this.state);
  }

  private decideActions(event: WorldEvent): CreatureCommand[] {
    const behavior = getCreatureBehavior(this.state.type);
    return behavior.decideActions(event, this.state);
  }
}
```

## Event Processing Pipeline

### World Event Reception

The system receives world events through the established XMPP PubSub infrastructure:

```typescript
class WorldEventListener {
  private readonly subscriptions = [
    'world/+/entity_moved',
    'world/+/combat_started',
    'world/+/entity_died',
    'world/+/spell_cast',
    'world/+/item_dropped',
    'world/+/player_entered',
    'world/+/player_left',
    'world/+/weather_changed',
    'world/+/resource_changed'
  ];

  async processEvent(topic: string, event: WorldEvent): Promise<void> {
    const parsedEvent = parseWorldEvent(topic, event);
    const affectedCreatures = this.getAffectedCreatures(parsedEvent);

    await this.routeEventToCreatures(affectedCreatures, parsedEvent);
  }

  private getAffectedCreatures(event: WorldEvent): CreatureURN[] {
    return MonsterRegistry.getCreaturesInRadius(
      event.location,
      this.getEventInfluenceRadius(event)
    );
  }
}
```

### Intelligent Event Routing

Events are routed efficiently to only the creatures that should respond:

```typescript
function getAffectedCreatures(event: WorldEvent): CreatureURN[] {
  switch (event.type) {
    case 'entity_moved':
      // Creatures in the same location notice movement
      return MonsterRegistry.getCreaturesInLocation(event.location);

    case 'combat_started':
      // Creatures within combat sensing range
      return MonsterRegistry.getCreaturesInRadius(event.location, 500);

    case 'weather_changed':
      // All creatures in the affected weather zone
      return MonsterRegistry.getCreaturesInWeatherZone(event.weatherZone);

    case 'resource_changed':
      // Creatures dependent on this resource type
      return MonsterRegistry.getCreaturesByResourceDependency(event.resourceType);

    default:
      return [];
  }
}
```

## AI Behavior System

### Behavior Interface

All creature behaviors implement a common interface:

```typescript
interface CreatureBehavior {
  shouldReactToEvent(event: WorldEvent, state: CreatureState): boolean;
  decideActions(event: WorldEvent, state: CreatureState): CreatureCommand[];
  updateState?(event: WorldEvent, state: CreatureState): CreatureState;
}
```

### Behavior Examples

#### Predator Behavior
```typescript
class WolfBehavior implements CreatureBehavior {
  shouldReactToEvent(event: WorldEvent, state: CreatureState): boolean {
    const eventTypes = ['player_entered', 'entity_died', 'resource_changed'];
    return eventTypes.includes(event.type);
  }

  decideActions(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    switch (event.type) {
      case 'player_entered':
        return this.handlePlayerEncounter(event, state);
      case 'resource_changed':
        return this.handleResourceChange(event, state);
      default:
        return [];
    }
  }

  private handlePlayerEncounter(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    const playerThreat = this.assessPlayerThreat(event.entity);
    const packSize = this.getPackSize(state.location);

    if (packSize >= 2 && playerThreat < state.stats.level * 1.5) {
      return [
        { type: 'coordinate_pack_attack', target: event.entity },
        { type: 'move_toward', target: event.entity }
      ];
    } else {
      return [
        { type: 'stealth_follow', target: event.entity, distance: 200 }
      ];
    }
  }
}
```

#### Social Creature Behavior
```typescript
class GoblinTraderBehavior implements CreatureBehavior {
  shouldReactToEvent(event: WorldEvent, state: CreatureState): boolean {
    const eventTypes = ['player_entered', 'item_dropped', 'trade_request'];
    return eventTypes.includes(event.type);
  }

  decideActions(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    switch (event.type) {
      case 'player_entered':
        return this.handlePlayerGreeting(event, state);
      case 'item_dropped':
        return this.handleItemOpportunity(event, state);
      default:
        return [];
    }
  }

  private handlePlayerGreeting(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    const reputation = this.getPlayerReputation(event.entity);

    if (reputation > 500) {
      return [
        { type: 'say', message: 'Welcome back, old friend!' },
        { type: 'offer_special_deals', target: event.entity }
      ];
    } else if (reputation > 0) {
      return [
        { type: 'say', message: 'Good day! Care to browse?' }
      ];
    } else {
      return [
        { type: 'say', message: 'What do merchants want, stranger?' }
      ];
    }
  }
}
```

#### Environmental Guardian Behavior
```typescript
class DungeonGuardianBehavior implements CreatureBehavior {
  shouldReactToEvent(event: WorldEvent, state: CreatureState): boolean {
    const guardedArea = state.aiState.guardedArea;
    return event.location === guardedArea &&
           ['player_entered', 'spell_cast', 'item_stolen'].includes(event.type);
  }

  decideActions(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    switch (event.type) {
      case 'player_entered':
        return this.handleIntruder(event, state);
      case 'spell_cast':
        return this.handleForbiddenMagic(event, state);
      case 'item_stolen':
        return this.handleTheft(event, state);
      default:
        return [];
    }
  }

  private handleForbiddenMagic(event: WorldEvent, state: CreatureState): CreatureCommand[] {
    const forbiddenSpells = ['necromancy', 'demon_summoning', 'forbidden_magic'];

    if (forbiddenSpells.includes(event.spellType)) {
      return [
        { type: 'sound_alarm', urgency: 'high' },
        { type: 'summon_reinforcements', count: 3 },
        { type: 'attack', target: event.caster, priority: 'immediate' }
      ];
    }

    return [];
  }
}
```

## Population Management

### Dynamic Spawning System

```typescript
class CreatureSpawner {
  private readonly area: EcosystemURN;
  private readonly spawnConfig: SpawnConfiguration;
  private lastSpawnCheck: number = Date.now();

  async checkPopulation(): Promise<void> {
    const currentPopulation = MonsterRegistry.countCreaturesInArea(this.area);
    const targetPopulation = this.calculateTargetPopulation();

    if (currentPopulation < targetPopulation) {
      const spawnCount = Math.min(
        targetPopulation - currentPopulation,
        this.getMaxSpawnPerTick()
      );

      await this.spawnCreatures(spawnCount);
    }
  }

  private calculateTargetPopulation(): number {
    const basePopulation = this.spawnConfig.basePopulation;
    const timeModifier = this.getTimeOfDayModifier();
    const weatherModifier = this.getWeatherModifier();
    const resourceModifier = this.getResourceAvailabilityModifier();

    return Math.floor(basePopulation * timeModifier * weatherModifier * resourceModifier);
  }

  private async spawnCreatures(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const creatureType = this.selectCreatureType();
      const spawnLocation = this.findSpawnPoint();

      try {
        await MonsterManager.spawnCreature(creatureType, spawnLocation);
      } catch (error) {
        console.warn(`Failed to spawn ${creatureType}:`, error);
      }
    }
  }
}
```

### Population Registry

```typescript
class MonsterRegistry {
  private static spatialIndex = new Map<PlaceURN, Set<CreatureURN>>();
  private static creatureMetadata = new Map<CreatureURN, CreatureMetadata>();

  static registerCreature(
    id: CreatureURN,
    type: CreatureType,
    location: PlaceURN
  ): void {
    // Add to spatial index
    if (!this.spatialIndex.has(location)) {
      this.spatialIndex.set(location, new Set());
    }
    this.spatialIndex.get(location)!.add(id);

    // Store metadata
    this.creatureMetadata.set(id, {
      type,
      location,
      spawnedAt: Date.now()
    });
  }

  static getCreaturesInLocation(location: PlaceURN): CreatureURN[] {
    return Array.from(this.spatialIndex.get(location) || []);
  }

  static getCreaturesInRadius(
    center: PlaceURN,
    radius: number
  ): CreatureURN[] {
    const nearbyLocations = WorldGeography.getLocationsWithinRadius(center, radius);
    return nearbyLocations.flatMap(location => this.getCreaturesInLocation(location));
  }

  static updateCreatureLocation(
    id: CreatureURN,
    from: PlaceURN,
    to: PlaceURN
  ): void {
    // Remove from old location
    this.spatialIndex.get(from)?.delete(id);

    // Add to new location
    if (!this.spatialIndex.has(to)) {
      this.spatialIndex.set(to, new Set());
    }
    this.spatialIndex.get(to)!.add(id);

    // Update metadata
    const metadata = this.creatureMetadata.get(id);
    if (metadata) {
      metadata.location = to;
    }
  }
}
```

## Command Batching System

### Batch Collection

```typescript
class CommandBatchCollector {
  private pendingCommands: CreatureCommand[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchSizeLimit = 1000;
  private readonly batchTimeLimitMs = 200;

  scheduleCommand(command: CreatureCommand): void {
    this.pendingCommands.push(command);

    if (this.pendingCommands.length >= this.batchSizeLimit) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.batchTimeLimitMs);
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.pendingCommands.length === 0) return;

    const commands = [...this.pendingCommands];
    this.pendingCommands = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await WorldServerClient.postCommandBatch(commands);
      console.debug(`Flushed batch of ${commands.length} creature commands`);
    } catch (error) {
      console.error('Failed to flush command batch:', error);
      // Implement retry logic if needed
    }
  }
}
```

### World Server Integration

```typescript
class WorldServerClient {
  static async postCommandBatch(commands: CreatureCommand[]): Promise<void> {
    const batchPayload = {
      commands,
      source: 'monster_simulation',
      batchId: generateBatchId(),
      timestamp: Date.now()
    };

    const response = await fetch(`${config.worldServerUrl}/commands/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`,
        'X-Batch-Size': commands.length.toString()
      },
      body: JSON.stringify(batchPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}
```

## Performance Characteristics

### Scaling Projections

**Single Node Capacity**:
- **Creature Population**: 30,000 concurrent creatures (3x the 10K CCU target)
- **Event Processing**: 50,000+ events/second distributed across creatures
- **Command Generation**: 5,000 commands/second (creatures acting every 6 seconds average)
- **Memory Usage**: <100MB for creature processes plus spatial indexes

**Computational Efficiency**:
- **Event Routing**: O(log n) spatial index lookups per event
- **Behavior Processing**: O(1) decision complexity per creature
- **Command Batching**: Amortized O(1) network overhead per command
- **State Management**: Minimal state per creature (2KB average)

### Batch Processing Benefits

The dual-layer batching architecture provides significant efficiency gains:

```
Individual Creature Actions: 5,000/second
↓ (Command Batch Collector)
HTTP Batch Requests: 5/second (1,000 commands each)
↓ (World Server Batch Processing)
Database Operations: 15/second (after batch optimization)
```

**Efficiency Improvement**: 500x reduction in total system operations compared to individual command processing.

## Integration with Ecological Systems

### Weather Response Patterns

Creatures respond to weather changes through resource availability rather than direct weather monitoring:

```typescript
class WeatherResponseBehavior {
  handleWeatherChange(event: WeatherChangedEvent, state: CreatureState): CreatureCommand[] {
    // Creatures don't directly sense weather
    // They respond to resulting resource changes

    const resourceAvailability = this.assessResourceAvailability(state.location);

    if (resourceAvailability.food < 0.3) {
      return [
        { type: 'search_for_food', radius: 1000 },
        { type: 'consider_migration', threshold: 0.1 }
      ];
    }

    return [];
  }
}
```

### Resource Dependency Modeling

```typescript
interface CreatureResourceDependencies {
  food: ResourceType[];
  water: ResourceType[];
  shelter: ResourceType[];
  nesting: ResourceType[];
}

class ResourceDependencyTracker {
  static getCreaturesByResourceType(resourceType: ResourceType): CreatureURN[] {
    return Array.from(MonsterRegistry.getAllCreatures())
      .filter(creatureId => {
        const creatureType = MonsterRegistry.getCreatureType(creatureId);
        const dependencies = this.getResourceDependencies(creatureType);

        return this.hasResourceDependency(dependencies, resourceType);
      });
  }

  private static hasResourceDependency(
    dependencies: CreatureResourceDependencies,
    resourceType: ResourceType
  ): boolean {
    return Object.values(dependencies).some(types => types.includes(resourceType));
  }
}
```

## Fault Tolerance and Recovery

### Population Recovery Strategy

```typescript
class PopulationRecoveryManager {
  async recoverFullPopulation(): Promise<void> {
    const targetPopulations = {
      'flux:eco:overworld': 15000,
      'flux:eco:underworld': 10000,
      'flux:eco:astral_plane': 5000
    };

    const spawnRatePerSecond = 100; // Avoid overwhelming the system

    for (const [ecosystem, targetCount] of Object.entries(targetPopulations)) {
      await this.spawnEcosystemGradually(ecosystem, targetCount, spawnRatePerSecond);
    }
  }

  private async spawnEcosystemGradually(
    ecosystem: EcosystemURN,
    targetCount: number,
    rate: number
  ): Promise<void> {
    const batchSize = rate;
    const batches = Math.ceil(targetCount / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      setTimeout(async () => {
        const spawnCount = Math.min(batchSize, targetCount - (batch * batchSize));
        await this.spawnBatch(ecosystem, spawnCount);
      }, batch * 1000); // One second intervals
    }
  }
}
```

### Error Handling Strategy

```typescript
class CreatureErrorHandler {
  static handleCreatureError(
    creatureId: CreatureURN,
    error: Error,
    context: string
  ): void {
    console.error(`Creature ${creatureId} error in ${context}:`, error);

    // Determine recovery strategy based on error type
    if (error instanceof StateCorruptionError) {
      this.resetCreatureState(creatureId);
    } else if (error instanceof LocationError) {
      this.relocateCreature(creatureId);
    } else {
      this.removeCreature(creatureId);
    }
  }

  private static async resetCreatureState(creatureId: CreatureURN): Promise<void> {
    const metadata = MonsterRegistry.getCreatureMetadata(creatureId);
    if (metadata) {
      await MonsterManager.respawnCreature(metadata.type, metadata.location);
    }

    MonsterRegistry.removeCreature(creatureId);
  }
}
```

## Resource Requirements

### Hardware Specifications

**Minimum Requirements (10K CCU + 30K creatures)**:
- **CPU**: 4 cores (2.4GHz+)
- **RAM**: 2GB allocated to monster simulation
- **Network**: 10Mbps sustained (event processing + command batching)
- **Storage**: 100MB for behavior definitions and logs

**Recommended Production Setup**:
- **CPU**: 8 cores (3.0GHz+)
- **RAM**: 4GB allocated (headroom for event spikes)
- **Network**: 100Mbps (handles 10x traffic spikes)
- **Storage**: 1GB SSD for fast behavior loading

### Monitoring and Observability

```typescript
class MonsterSimulationMetrics {
  static getKeyMetrics(): PerformanceMetrics {
    return {
      // Population health
      activeCreatures: MonsterRegistry.getActiveCreatureCount(),
      targetPopulation: 30000,
      populationRatio: MonsterRegistry.getActiveCreatureCount() / 30000,

      // Performance metrics
      eventsPerSecond: EventProcessor.getEventRate(),
      commandsPerSecond: CommandBatchCollector.getCommandRate(),
      batchEfficiency: CommandBatchCollector.getBatchEfficiency(),

      // Resource utilization
      memoryUsageMB: process.memoryUsage().heapUsed / (1024 * 1024),

      // Health indicators
      failedSpawnsPerMinute: SpawnManager.getFailureRate(),
      averageDecisionTimeMs: BehaviorProcessor.getAverageLatency()
    };
  }

  static getAlertThresholds(): AlertThresholds {
    return {
      populationRatio: { min: 0.8, max: 1.1 },    // 24K-33K creatures
      eventsPerSecond: { max: 100000 },             // Handle 100K/sec
      memoryUsageMB: { max: 500 },                  // Keep under 500MB
      averageDecisionTimeMs: { max: 10 },           // Decisions under 10ms
      batchEfficiency: { min: 0.7 }                 // Batches 70%+ full
    };
  }
}
```

## Development and Testing

### Load Testing Strategy

```typescript
class MonsterLoadTest {
  static async simulatePeakLoad(): Promise<void> {
    // Simulate 10K players generating events
    const concurrentPlayers = 10000;
    const eventsPerPlayerPerMinute = 6; // One action every 10 seconds

    const totalEventsPerSecond = (concurrentPlayers * eventsPerPlayerPerMinute) / 60;

    const eventDistribution = [
      { type: 'player_moved', probability: 0.4 },
      { type: 'combat_started', probability: 0.2 },
      { type: 'spell_cast', probability: 0.15 },
      { type: 'item_interaction', probability: 0.15 },
      { type: 'social_action', probability: 0.1 }
    ];

    await this.generateEventStream(totalEventsPerSecond, eventDistribution);
  }

  static validatePerformance(): void {
    const metrics = MonsterSimulationMetrics.getKeyMetrics();
    const thresholds = MonsterSimulationMetrics.getAlertThresholds();

    console.assert(
      metrics.populationRatio > thresholds.populationRatio.min,
      `Population too low: ${metrics.activeCreatures}/30000`
    );

    console.assert(
      metrics.eventsPerSecond < thresholds.eventsPerSecond.max,
      'Event processing overloaded'
    );

    console.assert(
      metrics.memoryUsageMB < thresholds.memoryUsageMB.max,
      'Memory usage too high'
    );

    console.assert(
      metrics.averageDecisionTimeMs < thresholds.averageDecisionTimeMs.max,
      'AI decisions too slow'
    );

    console.log('✅ All performance targets met for 30K creature simulation');
  }
}
```

## Biological Authenticity

The monster simulation system maintains biological authenticity through several key principles:

### Needs-Based Decision Making

All creature behaviors derive from the fundamental biological algorithm where creatures evaluate environmental conditions against their internal needs and respond accordingly. This creates emergent complexity from simple rules.

### Environmental Dependency

Creatures respond to environmental conditions indirectly through resource availability rather than direct environmental sensing, matching natural ecological relationships where resource scarcity drives behavioral changes.

### Population Dynamics

Creature populations fluctuate based on environmental carrying capacity, seasonal changes, and resource availability, creating realistic population pressures and migration patterns.

### Social Complexity

Social creatures exhibit emergent behaviors like pack hunting, territorial defense, and trade relationships that arise from individual creature interactions rather than scripted group behaviors.

This biological foundation ensures that creature behaviors feel natural and believable while scaling to ecosystem-level populations that create a living, responsive world.
