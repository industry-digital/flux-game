# Place-Based Resource Generation System

## Overview

This design extends the existing Place entity type to support time-based resource generation, building on the event-driven architecture and ecosystem modeling patterns already established in the Flux codebase. Places can now generate different types of resources as functions of time, environmental conditions, population dynamics, and seasonal changes.

## Key Design Principles

### Event-Driven Architecture Alignment
- **No Game Loops**: Resources only update when actors interact with places
- **Lazy Evaluation**: Generation is calculated on-demand when resources are accessed
- **Pure Functions**: All calculations are deterministic and side-effect free
- **Conditional Updates**: Uses database-level conditionals for atomicity

### Integration with Existing Systems
- **Builds on Lotka-Volterra**: Extends the ecosystem modeling pattern
- **Uses ResourceURN**: Integrates with the existing resource taxonomy
- **Duration Types**: Leverages established time modeling (`Duration`, `TimeUnit`)
- **Place Structure**: Extends the existing `Place` type without breaking changes

## Core Types

### GeneratedResource
```typescript
export type GeneratedResource<ResourceType extends ResourceURN> = AbstractResource<ResourceType> & {
  available: number;          // Current quantity available
  capacity: number;           // Maximum accumulation
  generationRate: {
    quantity: number;
    per: Duration;
  };
  lastUpdated: number;        // Timestamp for delta calculations
  decayRate?: {               // Optional resource degradation
    quantity: number;
    per: Duration;
  };
  generationConditions?: ResourceGenerationCondition[];
};
```

### Resource Generation Conditions
Resources can have multiple conditions that modify their generation rates:

- **Time-based**: Different rates during day/night cycles
- **Population-based**: Generation affected by entity populations
- **Environmental**: Temperature, rainfall, soil quality, pollution
- **Seasonal**: Different rates across seasons

## How It Works

### 1. Event-Driven Updates
When actors interact with a place (LOOK, HARVEST, etc.):
1. Calculate time elapsed since `lastUpdated`
2. Apply generation rate over the elapsed time
3. Apply all condition modifiers
4. Subtract decay (if applicable)
5. Ensure capacity limits are respected
6. Update the place state

### 2. Condition-Based Modifiers
```typescript
// Example: Berries grow 2x faster in summer with adequate rain
generationConditions: [
  {
    type: 'seasonal',
    season: 'summer',
    modifier: 2.0
  },
  {
    type: 'environmental_factor',
    factor: 'rainfall',
    minValue: 20,
    modifier: 1.3
  }
]
```

### 3. Resource Harvesting
```typescript
const harvestResult = harvestResourceFromPlace(
  place,
  'flux:resource:wood',
  requestedAmount,
  currentTime
);
// Returns: { updatedPlace, harvestedAmount }
```

## Example Use Cases

### 1. Enchanted Forest
- **Wood**: Grows based on season, reduced by over-harvesting
- **Berries**: Seasonal production with decay, enhanced by rainfall
- **Population Impact**: Too many humans reduce wood growth

### 2. Crystal Mine
- **Iron Ore**: Higher production during work shifts
- **Crystals**: Temperature-dependent formation, pollution-sensitive
- **Maintenance**: Global efficiency affected by upkeep

### 3. Sunny Farm
- **Wheat**: Multi-factor production (season, temperature, rainfall, soil, farmers)
- **Complex Interactions**: All environmental factors must align for optimal yield

## Integration with Commands

### HARVEST Command
```typescript
// Command planning would check resource availability
const canHarvest = canHarvestResource(place, resourceURN, amount);

// Command execution would update place state
const { updatedPlace, harvestedAmount } = harvestResourceFromPlace(
  place, resourceURN, amount
);
```

### LOOK Command
```typescript
// Looking at a place triggers resource updates
const updatedPlace = updatePlaceResourceGeneration(place);
// Display current resource availability to the actor
```

## Database Integration

### Atomic Updates
Following the existing conditional update pattern:
```sql
-- Update place resources with business rule enforcement
UPDATE world_fragment
SET data = jsonb_set(data, '{resourceGeneration,resources,flux:resource:wood,available}',
  to_jsonb(LEAST(
    (data#>>'{resourceGeneration,resources,flux:resource:wood,available}')::int + calculated_generation,
    (data#>>'{resourceGeneration,resources,flux:resource:wood,capacity}')::int
  )))
WHERE pk = 'flux:place:world:enchanted-forest'
  AND sk = 'base'
  AND (data#>>'{resourceGeneration,resources,flux:resource:wood,available}')::int <
      (data#>>'{resourceGeneration,resources,flux:resource:wood,capacity}')::int;
```

### Fragment Storage
- Resource generation data stored in place fragments
- Efficient dotpath updates for individual resource properties
- Spatial locality (place data co-located)

## Performance Characteristics

### Lazy Evaluation Benefits
- No continuous processing overhead
- Resources only calculated when needed
- Scales naturally with player activity

### Calculation Complexity
- O(n) where n = number of generation conditions
- Typically 2-5 conditions per resource
- Fast enough for real-time interaction

### Memory Efficiency
- No additional background processes
- State stored compactly in place fragments
- Time calculations use simple arithmetic

## Future Extensions

### Advanced Conditions
- **Weather Events**: Storm effects, drought impacts
- **Seasonal Transitions**: Gradual changes between seasons
- **Player Actions**: Maintenance, improvement activities
- **Economic Factors**: Supply/demand influences

### Cross-Place Interactions
- **Trade Routes**: Resource flow between places
- **Migration**: Population movement affecting generation
- **Environmental Spread**: Pollution, disease transmission

### Automation
- **Scheduled Events**: Periodic environmental changes
- **AI Actors**: Automated harvesters and maintainers
- **Market Dynamics**: Price-driven resource allocation

## Integration Patterns

### With Ecosystem Dynamics
```typescript
// Resource generation can affect population capacity
if (place.resourceGeneration.resources['flux:resource:food'].available > threshold) {
  place.ecosystem.populations.human.capacity *= 1.2;
}
```

### With Command Planning
```typescript
// Commands can check resource prerequisites
if (!canHarvestResource(place, requiredResource, requiredAmount)) {
  return { success: false, reason: 'Insufficient resources' };
}
```

### With Narrative Generation
```typescript
// Resource states can influence story generation
const berryAvailability = place.resourceGeneration.resources['flux:resource:berries'].available;
const narrative = berryAvailability > 50
  ? "The bushes are heavy with ripe berries"
  : "Only a few scattered berries remain on the bare branches";
```

## Conclusion

This resource generation system provides a foundation for rich, dynamic world economies while maintaining the architectural principles of the Flux system. It enables emergent gameplay through the interaction of multiple systems (time, environment, population, player actions) while remaining performant and maintainable through its event-driven design.

The system naturally supports both realistic resource management (farms need good conditions) and fantastical elements (magical crystal formation), making it suitable for diverse game worlds and scenarios.
