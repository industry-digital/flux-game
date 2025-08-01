# Flux Resource System: Environmental Constraints with Type-Based Specialization

## Core Philosophy

Resources follow a **binary growth/decay state machine** based on environmental conditions, with each resource having specific quantification strategies and environmental requirements. The system supports both bulk resources (measured by quantity) and specimen resources (measured by quality), creating diverse resource types with realistic growth patterns.

## Resource Distribution Constraints

### Type-Based Specialization

Each Place can support **only one resource of each type** at any given time. Resource types include:

- **Trees**: `mesquite`, `juniper`, `cottonwood`, `maple`, `oak`
- **Flowers**: `desert-marigold`, `wild-bergamot`, `purple-coneflower`, `orchid`
- **Minerals**: `iron`, `coal`, `tungsten`, `quartz`, `lithium`
- **Fungi**: `truffle`, `desert-puffball`, `chanterelle`, `honey-mushroom`

This constraint creates **natural specialization**:
- A mountain place might have: `mountain-pine` + `iron` + `alpine-aster` + `alpine-bolete`
- A jungle place might have: `mahogany` + `quartz` + `orchid` + `blood-red-cup-fungus`

### Benefits of Type Constraints

**Strategic Scarcity**: Players must explore different Places to find all needed resource types
**Natural Specialization**: Places develop distinct "resource personalities"
**Meaningful Choices**: Harvesting decisions have lasting consequences for Place identity

## Resource Data Model

### ResourceNodes Structure

Each Place maintains resources using URN-based identification with curve position and value tracking:

```typescript
/**
 * A record of the position and value of each resource node in the resource curve
 * We deliberately avoid nesting here and opt instead for URNs to keep the data structure compact.
 */
export type ResourceNodes = Record<ResourceURN, ResourceNodeState> & {
  /**
   * The timestamp of the last update to the resource nodes
   */
  ts: number;
};

export type ResourceNodeState = CurvePositionWithValue & {
  status: ResourceNodeStatus;
};
```

Example ResourceNodes data:
```typescript
{
  'flux:resource:tree:mesquite': {
    position: 0.7,      // Position on growth curve [0-1]
    value: 350,         // Computed resource value (kg of wood)
    status: 'growing',  // 'growing' | 'decaying'
  },
  'flux:resource:flower:desert-marigold': {
    position: 0.3,
    value: 30,          // Number of flowers
    status: 'decaying',
  },
  ts: 1717171717,       // Timestamp of last update
}
```

### Resource Quantification Strategies

Resources use two distinct quantification approaches:

#### Bulk Resources
Measured by total quantity that grows over time:
```typescript
export type BulkQuantificationStrategy = AbstractQuantificationStrategy<'bulk'> & {
  quantity: {
    measure: UnitOfMeasure | UnitOfMass | UnitOfVolume;
    min?: number;    // Minimum quantity (field never completely empty)
    capacity: number; // Maximum quantity (e.g., 200kg of grass)
    curve?: EasingFunctionName; // Optional override of growth.curve
  };
};
```

**Examples**: Grass fields (counted by flowers), water bodies (measured in liters), mineral deposits (measured in kg), tree copses (counted by trees)

#### Specimen Resources
Single items where quality grows over time:
```typescript
export type SpecimenQuantificationStrategy = AbstractQuantificationStrategy<'specimen'> & {
  quantity: {
    measure: UnitOfMeasure.EACH;
    min: 1;
    capacity: 1;
  };
  quality: {
    measure: Exclude<UnitOfMeasure, UnitOfMeasure.EACH> | UnitOfMass | UnitOfVolume;
    min: number;     // Minimum quality (e.g., 0.5kg for smallest fruit)
    capacity: number; // Maximum quality (e.g., 2kg for largest fruit)
  };
};
```

**Examples**: Individual fruit trees, beehives, single large specimens where the quality (size/potency) increases rather than quantity

## Resource Selection Algorithm

When determining which resources can grow in a Place, the system uses **environmental fitness scoring** based on comprehensive environmental requirements.

### 1. Viability Filtering

First, filter all resources by environmental requirements:

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

### 3. Best-Fit Selection

Select the resource with highest environmental fitness score for each type:

```typescript
function selectResourceByType(
  viableResources: ResourceSchema[],
  resourceType: string
): ResourceSchema | null {
  const typeResources = viableResources.filter(r => getResourceType(r) === resourceType);
  if (typeResources.length === 0) return null;

  // Return the resource with highest fitness score
  return typeResources.reduce((best, current) =>
    calculateFitness(current, weather) > calculateFitness(best, weather) ? current : best
  );
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
export const Easing: Record<EasingFunctionName, EasingFunction> = {
  LINEAR: (t: number) => t,                                      // Steady growth
  LOGISTIC: (t: number) => 1 / (1 + Math.exp(-12 * (t - 0.5))), // S-curve
  EXPONENTIAL: (t: number) => /* fast early growth */,           // Rapid colonization
  EASE_OUT_QUAD: (t: number) => 1 - (1 - t) * (1 - t),         // Fast start, slow end
  EASE_IN_QUAD: (t: number) => t * t,                           // Slow start, fast end
  CUBIC: (t: number) => t * t * (3 - 2 * t)                    // Smooth transitions
};
```

**Curve Selection Guidelines:**
- **LOGISTIC**: Most biological growth (flowers, trees) - S-curve with gradual start/end
- **EXPONENTIAL**: Rapid colonization (fungi, pioneer species) - fast early growth
- **LINEAR**: Steady accumulation (minerals, water collection) - constant rate
- **EASE_OUT_QUAD**: Fast establishment with diminishing returns
- **CUBIC**: Smooth acceleration then deceleration

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
- **Type constraints** - only one resource per type allowed

This creates **dynamic resource evolution** where Places develop changing resource compositions over time through natural succession cycles.

## Example Resource Definitions

### Bulk Resource Example (Desert Tree)
```typescript
export const MesquiteSchema: BulkResourceSchema = createTreeSchema({
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
    duration: [1, TimeUnit.MONTH]  // One month to mature
  },
  quantification: {
    type: 'bulk',
    quantity: {
      measure: UnitOfMeasure.EACH,
      min: 0,         // Can be completely harvested
      capacity: 1000  // Maximum 1000 trees in copse
    }
  }
});
```

### Specimen Resource Example (Individual Fruit Tree)
```typescript
export const DurianTreeSchema: SpecimenResourceSchema = {
  name: 'durian tree',
  slug: 'durian-tree',
  provides: ['fruit'],
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 60, max: 90 },
    biomes: ['jungle'],
    climates: ['tropical']
  },
  growth: {
    curve: 'LOGISTIC',
    duration: [7, TimeUnit.DAY]  // 7 days for fruit to ripen
  },
  quantification: {
    type: 'specimen',
    quantity: { measure: UnitOfMeasure.EACH, min: 1, capacity: 1 },
    quality: {
      measure: UnitOfMass.KILOGRAMS,
      min: 0.5,       // Minimum 0.5kg fruit
      capacity: 2.0   // Maximum 2kg premium fruit
    }
  }
};
```

### Complex Environmental Requirements Example
```typescript
export const BlackLotusSchema: BulkResourceSchema = createFlowerSchema({
  name: 'black lotus',
  slug: 'black-lotus',
  provides: ['flower', 'nectar', 'seeds', 'roots'],
  requirements: {
    temperature: { min: 15, max: 32 },
    humidity: { min: 60, max: 90 },
    ppfd: { max: 200 },             // Shade-loving
    seasons: ['spring', 'summer', 'fall'],
    time: ['dusk', 'night'],        // Nocturnal blooming
    lunar: ['full']                 // Only during full moon
  }
});
```

## Benefits of This System

### **Type-Based Specialization**
- Maximum one resource per type per Place eliminates abundance problem
- Forces exploration for specific resource types
- Creates natural Place specialization ("the iron mountain", "the medicinal herb grove")

### **Environmental Authenticity**
- Resources that fit conditions better are more likely to appear
- Weather and seasonal changes affect resource composition
- Maintains biological realism through environmental constraints

### **Dynamic Gameplay**
- Resource succession creates changing opportunities over time
- Environmental changes can shift which resources can grow
- Depletion decisions have lasting consequences for Place identity

### **Emergent Specialization**
- Places develop distinct resource "personalities"
- Environmental fitness creates predictable but varied distributions
- Player actions influence long-term resource composition through succession cycles

The system creates **predictable specialization** (one resource per type) with **dynamic variety** (which specific resources depend on environmental fitness and succession), solving the abundance problem while maintaining ecological authenticity and strategic depth.
