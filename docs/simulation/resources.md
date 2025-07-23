# Flux Resource Growth System: Binary Growth/Decay with Curve Positions

## Core Philosophy
Resources follow a binary state machine: they are either **growing** or **decaying** based on environmental conditions. Each resource tracks its position on a mathematical curve, creating predictable yet dynamic resource patterns that emerge from environmental conditions.

## Resource Models

The system supports two distinct resource models:

### Specimen Resources
```typescript
type SpecimenResourceSchema = ResourceSchemaBase & {
  quantity: {
    measure: UnitOfMeasure.EACH;
    min: 1;
    capacity: 1;
  };
  quality: {
    measure: Exclude<UnitOfMeasure, UnitOfMeasure.EACH> | UnitOfMass | UnitOfVolume;
    min: number;     // Minimum quality (e.g., 0.5kg for smallest valid fruit)
    capacity: number; // Maximum quality (e.g., 2kg for largest possible fruit)
  };
};
```
- Single items that grow in quality (e.g., a fruit, a beehive)
- Quantity is fixed at 1
- Quality grows from min to capacity based on growth curve
- Examples: A single durian fruit growing from 0.5kg to 2kg

### Bulk Resources
```typescript
type BulkResourceSchema = ResourceSchemaBase & {
  quantity: {
    measure: UnitOfMeasure | UnitOfMass | UnitOfVolume;
    min?: number;    // Minimum quantity (e.g., 50kg - field never completely empty)
    capacity: number; // Maximum quantity (e.g., 200kg of grass)
  };
};
```
- Collections that grow in quantity (e.g., a field, a pond)
- Quality is fixed at 1
- Quantity grows from min to capacity based on growth curve
- Examples: A field growing from 50kg to 200kg of grass

## Binary Growth/Decay State Machine

Resources have no intermediate states - they are always either growing toward capacity or decaying toward their minimum:

```typescript
export function updateResource(
  schema: ResourceSchema,
  ecosystem: EcosystemURN,
  weather: Weather,
  node: ResourceNodeState,
  now: number = Date.now()
): ResourceNodeState {
  const deltaTime = now - node.curve.ts;
  if (deltaTime <= 0) return node;

  const isGrowing = doesResourceGrowInPlace(schema, ecosystem, weather, now);

  if (isSpecimenSchema(schema)) {
    return updateSpecimenResource(schema, isGrowing, deltaTime, node, now);
  } else {
    return updateBulkResource(schema, isGrowing, deltaTime, node, now);
  }
}
```

This creates clear ecological boundaries:
- **ALL growth requirements met** → Resource GROWS
- **ANY growth requirement not met** → Resource DECAYS
- **Immediate response** to environmental changes
- **Clear seasonal dynamics** without complex transitions

## Growth and Decay Curves

### Easing Functions
```typescript
export const Easing: Record<EasingFunctionName, EasingFunction> = {
  LINEAR: (t: number) => t,
  // Centered S-curve with steeper middle section
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-12 * (t - 0.5))),
  // Normalized exponential with faster early growth
  EXPONENTIAL: (t: number) => {
    const t2 = t * 1.5; // Stretch input for faster early growth
    return Math.min(1, (Math.exp(6 * t2) - 1) / (Math.exp(6) - 1));
  },
  EASE_OUT_QUAD: (t: number) => 1 - (1 - t) * (1 - t),
  EASE_IN_QUAD: (t: number) => t * t,
  CUBIC: (t: number) => t * t * (3 - 2 * t),
};
```

### Decay Behavior
- If no decay curve specified, inverts the growth curve:
```typescript
function invertEasing(easing: EasingFunction): EasingFunction {
  return (t: number) => 1 - easing(1 - t);
}
```
- Default decay duration: 1 day
- Maintains curve shape but reverses direction

### Curve Position Updates
```typescript
function calculateNewPosition(
  currentPosition: number,
  deltaTimeMs: number,
  duration: readonly [number, TimeUnit],
): number {
  if (deltaTimeMs <= 0) return currentPosition;

  const durationMs = durationToMs(duration);
  const positionIncrement = deltaTimeMs / durationMs;
  return Math.min(1, Math.max(0, currentPosition + positionIncrement));
}
```

## Environmental Requirements

Resources respond to a comprehensive set of environmental factors:

```typescript
export type ResourceGrowthRequirements = {
  temperature?: Bounds;         // Celsius
  pressure?: Bounds;           // hectopascals (hPa)
  humidity?: Bounds;           // percentage (0-100)
  precipitation?: Bounds;      // mm/hour
  ppfd?: Bounds;              // μmol/m²/s (light)
  clouds?: Bounds;            // percentage (0-100)
  fog?: Bounds;               // normalized (0-1)
  seasons?: Season[];         // spring, summer, fall, winter
  time?: TimeOfDay[];        // dawn, morning, day, afternoon, evening, dusk, night
  lunar?: LunarPhase[];      // new, waxing, full, waning
  biomes?: Biome[];          // steppe, grassland, forest, mountain, jungle, marsh
  climates?: Climate[];      // arid, temperate, tropical
};
```

### Environmental Condition Checking
```typescript
export function doesResourceGrowInPlace(
  resource: ResourceSchema,
  ecosystem: EcosystemURN,
  weather: Weather,
  now: number = Date.now()
): boolean {
  const ecology = ECOLOGICAL_PROFILES[ecosystem];
  if (!ecology) return false;

  // Check each requirement against current conditions
  // ANY failed check triggers decay
  // ALL checks must pass for growth
}
```

## Example Resource Definitions

### Durian - Specimen Resource
```typescript
const DurianSchema: SpecimenResourceSchema = {
  name: 'durian',
  slug: 'durian',
  provides: ['fruit'],
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 60, max: 90 },
    biomes: ['jungle'],
    climates: ['tropical'],
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [7, TimeUnit.DAY],
  },
  quantity: {
    measure: UnitOfMeasure.EACH,
    min: 1,
    capacity: 1,
  },
  quality: {
    measure: UnitOfMass.KILOGRAMS,
    min: 0.5,    // Smallest valid fruit: 0.5kg
    capacity: 2,  // Largest possible fruit: 2kg
  },
  description: () => 'a durian fruit',
};
```

### Grass Field - Bulk Resource
```typescript
const GrassFieldSchema: BulkResourceSchema = {
  name: 'grass field',
  slug: 'grass-field',
  provides: ['grass'],
  requirements: {
    temperature: { min: 5, max: 30 },
    ppfd: { min: 500 },
    biomes: ['grassland'],
    climates: ['temperate'],
  },
  growth: {
    curve: Easing.EXPONENTIAL,
    duration: [14, TimeUnit.DAY],
  },
  quantity: {
    measure: UnitOfMass.KILOGRAMS,
    min: 50,     // Field never completely empty
    capacity: 200, // Maximum 200kg of grass
  },
  description: () => 'a field of grass',
};
```

## Implementation Guidelines

### Choosing Growth Curves
- **Easing.LOGISTIC**: Most biological growth (flowers, populations)
  - Centered S-curve with steeper middle section
  - Good for gradual start/end with rapid middle growth
- **Easing.EXPONENTIAL**: Rapid early growth (fungi, colonization)
  - Fast initial growth that slows near capacity
  - Good for resources that establish quickly
- **Easing.LINEAR**: Steady accumulation (minerals, simple resources)
  - Constant growth rate
  - Good for predictable, mechanical processes
- **Easing.EASE_IN_QUAD**: Accelerating processes
  - Starts slow, continuously accelerates
  - Good for momentum-based growth
- **Easing.EASE_OUT_QUAD**: Decelerating processes
  - Starts fast, continuously decelerates
  - Good for rapid establishment with diminishing returns
- **Easing.CUBIC**: Smooth transitions
  - Similar to LOGISTIC but with gentler curve
  - Good for general-purpose smooth growth

### Environmental Requirements
- Define ALL conditions that must be met for growth
- ANY failed condition triggers decay
- Use tight ranges for ecological specialization
- Combine multiple factors for niche creation
- Consider both biome and climate restrictions

### Duration Settings
- Growth duration: Time from min to capacity
- Decay duration: Time from capacity to min
- Default decay duration: 1 month if not specified
- Shorter durations = more responsive to environmental changes
- Longer durations = more stable resource presence

The decay duration specifies how long it would take for a resource to decay from capacity to min if decay conditions persist. The actual decay time depends on where the resource is on its curve when decay begins. For example:
- A resource at 75% of its range will take about 25% of the decay duration to reach min
- A resource at 50% of its range will take about 50% of the decay duration to reach min
- A resource at 25% of its range will take about 75% of the decay duration to reach min

The system creates emergent ecological patterns where environmental conditions determine resource distribution, with each species following its characteristic growth curve while responding immediately to changing conditions through clear binary state transitions.
