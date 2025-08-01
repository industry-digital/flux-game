# Flux Resource System: Environmental Constraints with Strategic Scarcity

## Core Philosophy

Resources follow a **binary growth/decay state machine** based on environmental conditions, with each resource having specific quantification strategies and environmental requirements. The system supports both bulk resources (measured by quantity) and specimen resources (measured by quality), creating diverse resource types with realistic growth patterns.

## Resource Data Model

### ResourceNodes Structure

Each Place maintains resources using URN-based identification with curve position and value tracking:

```typescript
/**
 * A record of the position and value of each resource node in the resource curve
 * We deliberately avoid nesting here and opt instead for URNs to keep the data structure compact.
 */
export type ResourceNodes = Record<ResourceURN, CurvePositionWithValue> & {
  /**
   * The timestamp of the last update to the resource nodes
   */
  ts: number;
};
```

Example ResourceNodes data:
```typescript
{
  'flux:resource:apple': {
    position: 0.5,  // Position on growth curve [0-1]
    value: 10       // Computed resource value at this position
  },
  'flux:resource:wood:oak': {
    position: 0.2,
    value: 50
  },
  ts: 1717171717,   // Timestamp of last update
}
```

### Resource Quantification Strategies

Resources use two distinct quantification approaches:

#### Bulk Resources
Measured by total quantity that grows over time:
```typescript
export type BulkQuantificationStrategy = {
  type: 'bulk';
  quantity: {
    measure: UnitOfMeasure | UnitOfMass | UnitOfVolume;
    min?: number;    // Minimum quantity (field never completely empty)
    capacity: number; // Maximum quantity (e.g., 200kg of grass)
    curve?: EasingFunctionName; // Optional override of growth.curve
  };
};
```

**Examples**: Grass fields, water bodies, mineral deposits, flower patches

#### Specimen Resources
Single items where quality grows over time:
```typescript
export type SpecimenQuantificationStrategy = {
  type: 'specimen';
  quantity: { measure: UnitOfMeasure.EACH; min: 1; capacity: 1; };
  quality: {
    measure: UnitOfMass | UnitOfVolume;
    min: number;     // Minimum quality (e.g., 0.5kg for smallest fruit)
    capacity: number; // Maximum quality (e.g., 2kg for largest fruit)
  };
};
```

**Examples**: Individual fruit trees, beehives, single large specimens

## Resource Selection Algorithm

When determining which resources can grow in a Place, the system uses **environmental fitness scoring** based on comprehensive environmental requirements.

### 1. Viability Filtering

First, filter resources by environmental requirements:

```typescript
function getViableResources(
  ecosystem: EcosystemURN,
  weather: Weather
): ResourceSchema[] {
  return ALL_RESOURCES.filter(resource =>
    doesResourceGrowInPlace(resource, ecosystem, weather)
  );
}
```

### 2. Environmental Fitness Scoring

Rate how well each viable resource matches current conditions:

```typescript
function calculateFitness(resource: ResourceSchema, weather: Weather): number {
  let score = 1.0;

  // Temperature fitness (closer to optimal = higher score)
  const tempRange = resource.requirements.temperature;
  if (tempRange) {
    const optimal = (tempRange.min + tempRange.max) / 2;
    const deviation = Math.abs(weather.temperature - optimal);
    score *= Math.max(0, 1 - deviation / 20);
  }

  // Similar calculations for humidity, light, etc.
  return score;
}
```

### 3. Rarity-Weighted Selection

Combine environmental fitness with rarity for natural distributions:

```typescript
const RESOURCE_RARITY = {
  'iron': 0.8,           // Common mineral
  'tungsten': 0.2,       // Rare mineral
  'desert-marigold': 0.7, // Common flower
  'black-lotus': 0.1     // Very rare flower
};

function selectResource(scored: ScoredResource[]): ResourceSchema {
  // Weighted selection: fitness × rarity
  return weightedRandomSelect(scored);
}
```

## Binary Growth/Decay State Machine

Resources have no intermediate states - they are always either **growing** toward capacity or **decaying** toward minimum based on environmental conditions.

### Environmental Condition Checking

```typescript
export function doesResourceGrowInPlace(
  resource: ResourceSchema,
  ecosystem: EcosystemURN,
  weather: Weather
): boolean {
  // ALL requirements must be met for growth
  // ANY failed requirement triggers decay

  const required = resource.requirements;

  // Temperature check
  if (required.temperature?.min && weather.temperature < required.temperature.min) return false;
  if (required.temperature?.max && weather.temperature > required.temperature.max) return false;

  // Humidity, light, seasonal checks...
  return true;
}
```

This creates clear ecological boundaries:
- **ALL growth requirements met** → Resource GROWS
- **ANY growth requirement not met** → Resource DECAYS
- **Immediate response** to environmental changes

## Growth Curves and Environmental Requirements

### Easing Functions

Resources use mathematical curves to model realistic growth patterns:

```typescript
export const Easing = {
  LINEAR: (t: number) => t,                    // Steady growth
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-12 * (t - 0.5))), // S-curve
  EXPONENTIAL: (t: number) => /* fast early growth */,
  CUBIC: (t: number) => t * t * (3 - 2 * t)   // Smooth transitions
};
```

**Curve Selection Guidelines:**
- **LOGISTIC**: Most biological growth (flowers, trees)
- **EXPONENTIAL**: Rapid colonization (fungi, pioneer species)
- **LINEAR**: Steady accumulation (minerals, water collection)

### Environmental Requirements

Resources define comprehensive conditions needed for growth:

```typescript
export type ResourceGrowthRequirements = {
  temperature?: { min?: number, max?: number };     // Celsius
  pressure?: { min?: number, max?: number };        // hectopascals (hPa)
  humidity?: { min?: number, max?: number };        // Percentage (0-100)
  precipitation?: { min?: number, max?: number };   // mm/hour
  ppfd?: { min?: number, max?: number };           // Light (μmol/m²/s)
  clouds?: { min?: number, max?: number };         // Cloud cover (0-100%)
  fog?: { min?: number, max?: number };            // Fog intensity (0-1)
  seasons?: Season[];                              // Active seasons
  time?: TimeOfDay[];                              // Active times of day
  lunar?: LunarPhase[];                            // Lunar phase requirements
  biomes?: Biome[];                                // Ecosystem restrictions
  climates?: Climate[];                            // Climate restrictions
};

// Supporting types
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'afternoon' | 'evening' | 'dusk' | 'night';
export type LunarPhase = 'new' | 'waxing' | 'full' | 'waning';
```

## Resource Lifecycle and Succession

### Growth and Decay Mechanics

Resources follow their growth curves when environmental conditions are met:

```typescript
// Growth calculation for bulk resources
const currentQuantity = quantity.min + (growthCurve(position) * (quantity.capacity - quantity.min));

// Growth calculation for specimen resources
const currentQuality = quality.min + (growthCurve(position) * (quality.capacity - quality.min));
```

### Resource Succession

When resources are depleted or environmental conditions change, new resources can establish based on:

- **Environmental fitness** - how well current conditions match requirements
- **Seasonal availability** - resources that can grow in current season
- **Ecosystem compatibility** - biome and climate restrictions
- **Temporal factors** - time of day and lunar phase requirements

This creates **dynamic resource evolution** where Places develop changing resource compositions over time through natural succession cycles.

## Example Resource Definitions

### Bulk Resource Example (Desert Tree)
```typescript
export const MesquiteSchema: BulkResourceSchema = {
  name: 'mesquite',
  slug: 'mesquite',
  provides: ['wood', 'bark', 'nectar'],
  requirements: {
    temperature: { min: 10, max: 45 },
    humidity: { min: 15, max: 60 },
    precipitation: { min: 0.2 },
    seasons: ['spring', 'summer', 'fall']
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [365, TimeUnit.DAY]  // One year to mature
  },
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfMass.KG,
      min: 10,        // Always some wood available
      capacity: 500   // Maximum 500kg of wood
    }
  }
};
```

### Specimen Resource Example (Rare Fruit)
```typescript
export const BlackLotusSchema: SpecimenResourceSchema = {
  name: 'black lotus',
  slug: 'black-lotus',
  provides: ['flower', 'nectar', 'seeds', 'roots'],
  requirements: {
    temperature: { min: 15, max: 32 },
    humidity: { min: 60, max: 90 },
    ppfd: { max: 200 },           // Shade-loving
    seasons: ['spring', 'summer', 'fall'],
    lunar: ['full']               // Only during full moon
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [90, TimeUnit.DAY]  // 90 days to full quality
  },
  quantification: {
    type: 'specimen',
    quantity: { measure: UnitOfMeasure.EACH, min: 1, capacity: 1 },
    quality: {
      measure: UnitOfMass.G,
      min: 5,         // Minimum 5g flower
      capacity: 50    // Maximum 50g premium flower
    }
  }
};
```

## Benefits of This System

### **Strategic Scarcity**
- Maximum 5 resources per Place eliminates abundance problem
- Forces exploration for specific resource types
- Creates natural specialization ("the iron mountain")

### **Environmental Authenticity**
- Resources that fit conditions better are more likely to appear
- Weather and seasonal changes affect resource composition
- Maintains biological realism through environmental constraints

### **Dynamic Gameplay**
- Resource succession creates changing opportunities
- Depletion decisions have lasting consequences
- Rare resources create valuable exploration targets

### **Emergent Specialization**
- Places develop resource "personalities" over time
- Player actions influence long-term resource composition
- Natural trade opportunities emerge between specialized locations

The system creates **predictable scarcity** (fixed slot limits) with **dynamic variety** (which resources depend on environmental fitness and succession cycles), solving the abundance problem while maintaining ecological authenticity and strategic depth.
