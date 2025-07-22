# Flux Resource Growth System: Binary Growth/Decay with Curve Positions

## Core Philosophy
Resources follow a binary state machine: they are either **growing** or **decaying** based on environmental conditions. Each resource tracks its position on a mathematical curve, creating predictable yet dynamic resource patterns that emerge from environmental conditions.

## Binary Growth/Decay State Machine

Resources have no intermediate states - they are always either growing toward capacity or decaying toward zero:

```typescript
// Simple binary check determines resource state
function updateResource(
  schema: ResourceSchema,
  ecosystem: EcosystemURN,
  weather: Weather,
  node: ResourceNodeState,
  now: number = Date.now()
): ResourceNode {
  // Binary check: either growing or decaying
  const isGrowing = doesResourceGrowInPlace(
    schema,
    ecosystem,
    weather,
    now,
  );

  return {
    ...resource,
    curve: {
      position: node.curve.position,
      status: isGrowing ? 'growing' : 'decaying',
      ts: now,
    }
  };
}
```

This creates clear ecological boundaries:
- **ALL growth requirements met** → Resource GROWS
- **ANY growth requirement not met** → Resource DECAYS
- **Immediate response** to environmental changes
- **Clear seasonal dynamics** without complex transitions

## Data Structure

### Resource Node State
```typescript
export type ResourceNodeCurve = {
  position: number;           // Current position on curve (X-axis)
  status: 'growing' | 'decaying';
  ts: number;                 // Last update timestamp
};

export type ResourceNodeState = {
  quantity: number;           // Current discrete amount
  quality: number;            // Resource quality/potency
  fullness: NormalizedValueBetweenZeroAndOne;
  curve: ResourceNodeCurve;   // Curve tracking state
};

export type ResourceNodes = {
  ts: number;                 // When resources were last updated
  nodes: Partial<Record<ResourceURN, ResourceNodeState>>;
};
```

### Resource Schema Structure
```typescript
type ResourceSchema = {
  name: string;
  provides: string[];         // What this resource yields
  requirements: {             // Environmental conditions for growth
    temperature?: { min?: number, max?: number };
    humidity?: { min?: number, max?: number };
    ppfd?: { min?: number };  // Light requirements
    seasons?: Season[];
    time?: TimeOfDay[];
    biomes?: Biome[];
    lunar?: LunarPhase[];
  };
  growth: {
    curve: EasingFunction;    // Growth curve type
    duration: [number, TimeUnit];
  };
  decay?: {
    curve: EasingFunction;    // Decay curve type
    duration: [number, TimeUnit];
  };
  quantity: {
    measure: UnitOfMeasure;
    capacity: number;         // Hard cap
  };
}
```

## Environmental Condition Checking

```typescript
export const doesResourceGrowInPlace = (
  resource: ResourceSchema,
  ecosystem: EcosystemURN,
  weather: Weather
): boolean => {
  const ecology = ECOLOGICAL_PROFILES[ecosystem];
  if (!ecology) return false;

  const required = resource.requirements;

  // Temperature check
  if (required.temperature) {
    if (typeof required.temperature?.min === 'number' &&
        weather.temperature < required.temperature.min) {
      return false;
    }
    if (typeof required.temperature?.max === 'number' &&
        weather.temperature > required.temperature.max) {
      return false;
    }
  }

  // Humidity check
  if (required.humidity) {
    if (typeof required.humidity?.min === 'number' &&
        weather.humidity < required.humidity.min) {
      return false;
    }
    if (typeof required.humidity?.max === 'number' &&
        weather.humidity > required.humidity.max) {
      return false;
    }
  }

  // Light check (PPFD)
  if (required.ppfd?.min && weather.ppfd < required.ppfd.min) {
    return false;
  }

  // Seasonal check
  if (required.seasons && !required.seasons.includes(weather.season)) {
    return false;
  }

  // Time of day check
  if (required.time && !required.time.includes(weather.timeOfDay)) {
    return false;
  }

  // Lunar phase check
  if (required.lunar && !required.lunar.includes(weather.lunarPhase)) {
    return false;
  }

  // All requirements met
  return true;
};
```

## Curve Position Mathematics

### Current Amount Calculation
```typescript
function getCurrentAmount(
  schema: ResourceSchema,
  node: ResourceNodeState,
): number {
  // Get normalized progress (0 to 1) from current curve position
  const normalizedProgress = applyEasingFunction(
    node.curve.status === 'growing' ? schema.growth.curve : schema.decay.curve,
    node.curve.position
  );

  // Both growth and decay are pegged to capacity
  return Math.floor(
    node.curve.status === 'growing'
      ? normalizedProgress * schema.quantity.capacity        // 0 -> capacity
      : (1 - normalizedProgress) * schema.quantity.capacity  // capacity -> 0
  );
}
```

### Easing Function Application
```typescript
function applyEasingFunction(
  curve: EasingFunction,
  position: number        // Position on X-axis
): number {              // Returns Y value (0 to 1)
  switch (curve) {
    case Easing.LOGISTIC:
      return 1 / (1 + Math.exp(-position));  // S-curve

    case Easing.EXPONENTIAL:
      return 1 - Math.exp(-position);        // Fast start, slow end

    case Easing.LINEAR:
      return Math.min(1, position);          // Constant rate

    case Easing.EASE_IN_QUAD:
      return position * position;            // Accelerating

    case Easing.EASE_OUT_QUAD:
      return position * (2 - position);      // Decelerating

    case Easing.CUBIC:
      const t = Math.min(1, position);
      return t * t * (3 - 2 * t);           // Smooth S-curve

    default:
      return Math.min(1, position);          // Fallback to linear
  }
}
```

## Growth vs Decay Calculations

Both growth and decay are pegged to capacity, creating a consistent mathematical model:

```typescript
function getCurrentAmount(
  schema: ResourceSchema,
  node: ResourceNodeState,
): number {
  // Get normalized progress (0 to 1) from current curve position
  const normalizedProgress = applyEasingFunction(
    node.curve.status === 'growing' ? schema.growth.curve : schema.decay.curve,
    node.curve.position
  );

  // Both growth and decay are pegged to capacity
  return Math.floor(
    node.curve.status === 'growing'
      ? normalizedProgress * schema.quantity.capacity        // 0 -> capacity
      : (1 - normalizedProgress) * schema.quantity.capacity  // capacity -> 0
  );
}
```

This creates a symmetrical system where:
1. Growth progresses from 0 to capacity
2. Decay progresses from capacity to 0
3. Curve position always maps to a fixed percentage of capacity
4. Harvesting can happen during either growth or decay
5. No moving reference points - everything is pegged to capacity

Example:
```typescript
const resource = {
  quantity: {
    capacity: 100  // Max amount
  },
  growth: {
    curve: Easing.LOGISTIC,
    duration: [5, TimeUnit.DAY]
  },
  decay: {
    curve: Easing.EXPONENTIAL,
    duration: [2, TimeUnit.DAY]
  }
};

// Growth at position 0.5 (logistic curve ≈ 0.62)
// amount = 0.62 * 100 = 62

// Decay at position 0.5 (exponential curve ≈ 0.39)
// amount = (1 - 0.39) * 100 = 61

// Harvesting works the same in both states:
// 1. Calculate current amount from curve
// 2. Subtract harvested amount
// 3. Find new curve position for remaining amount
// 4. Continue along current curve (growth or decay)
```

## Harvesting Implementation

### Curve Position Reset on Harvest
```typescript
function harvestResource(
  schema: ResourceSchema,
  node: ResourceNodeState,
  harvestAmount: number,
  now: number = Date.now()
): ResourceNodeState {
  const newAmount = node.quantity - harvestAmount;

  // Find where on growth curve this amount would occur
  const newPosition = findCurveTimeForAmount(
    schema.growth,
    newAmount
  );

  return {
    ...node,
    quantity: newAmount,
    curve: {
      position: newPosition,    // Reset to intersection point
      status: 'growing',        // Continue on growth curve
      ts: now                   // Fresh timestamp
    }
  };
}
```

### Finding Curve Intersection Points
```typescript
/**
 * Find the position on the curve that corresponds to the given amount.
 * This solves for X where curve(X) * capacity = targetAmount
 */
function findCurveTimeForAmount(
  growth: Growth,
  targetAmount: number
): number {
  const progress = targetAmount / growth.capacity;

  // Solve inverse equations for each curve type
  switch (growth.curve) {
    case Easing.LOGISTIC:
      // Solve: 1/(1 + e^(-t)) = progress
      return Math.log((1/progress) - 1) * -1;

    case Easing.EXPONENTIAL:
      // Solve: 1 - e^(-t) = progress
      return -Math.log(1 - progress);

    case Easing.LINEAR:
      // Solve: t = progress
      return progress;

    case Easing.EASE_IN_QUAD:
      // Solve: t^2 = progress
      return Math.sqrt(progress);

    case Easing.EASE_OUT_QUAD:
      // Solve: t*(2-t) = progress
      return 1 - Math.sqrt(1 - progress);

    default:
      return progress; // Fallback to linear
  }
}
```

## Example Resource Definitions

### Desert Marigold - Hardy Desert Flower
```typescript
export const DesertMarigoldSchema = createResourceSchema({
  name: 'desert marigold',
  provides: ['flower', 'nectar'],
  requirements: {
    temperature: { min: 15, max: 35 },
    humidity: { min: 15, max: 45 },
    ppfd: { min: 1_200 },
    seasons: ['spring', 'summer'],
    time: ['morning', 'day', 'afternoon']
  },
  growth: {
    curve: Easing.LOGISTIC,      // Classic S-curve growth
    duration: [5, TimeUnit.DAY]
  },
  decay: {
    curve: Easing.EXPONENTIAL,   // Wilts quickly in bad conditions
    duration: [2, TimeUnit.DAY]
  },
  quantity: { capacity: 100 }
});
```

### Swamp Bracket Fungus - Resilient Decomposer
```typescript
export const SwampBracketSchema = createResourceSchema({
  name: 'swamp bracket',
  provides: ['mushroom', 'spores'],
  requirements: {
    temperature: { min: 15, max: 29 },
    humidity: { min: 90, max: 99 },
    ppfd: { max: 200 },           // Shade-loving
    seasons: ['winter', 'spring']
  },
  growth: {
    curve: Easing.EASE_IN_QUAD,   // Slow start, accelerating
    duration: [21, TimeUnit.DAY]
  },
  decay: {
    curve: Easing.LINEAR,         // Very slow, steady decay
    duration: [30, TimeUnit.DAY]
  },
  quantity: { capacity: 8 }
});
```

### Large Puddle - Ephemeral Water Body
```typescript
export const LargePuddleSchema = createResourceSchema({
  name: 'large puddle',
  provides: ['water'],
  requirements: {
    precipitation: { min: 1 }     // Only during rain
  },
  growth: {
    curve: Easing.EASE_OUT_QUAD,  // Quick filling
    duration: [1, TimeUnit.HOUR]
  },
  decay: {
    curve: Easing.EXPONENTIAL,    // Rapid evaporation
    duration: [1, TimeUnit.DAY]
  },
  quantity: { capacity: 1000 }    // Liters
});
```

## Update Strategy

### Curve Position Updates
```typescript
function updateResourceGrowth(
  schema: ResourceSchema,
  node: ResourceNodeState,
  deltaTime: number,
  isGrowing: boolean,
  now: number = Date.now()
): ResourceNodeState {
  // Convert duration to position increment
  const duration = isGrowing ? schema.growth.duration : schema.decay.duration;
  const [value, unit] = duration;
  const durationMs = value * TimeUnit[unit] * 1000;

  // Advance position based on time elapsed
  const positionIncrement = deltaTime / durationMs;
  const newPosition = node.curve.position + positionIncrement;

  // Calculate new amount based on curve position
  const normalizedProgress = applyEasingFunction(
    isGrowing ? schema.growth.curve : schema.decay.curve,
    newPosition
  );

  let newAmount;
  if (isGrowing) {
    newAmount = Math.floor(normalizedProgress * schema.quantity.capacity);
  } else {
    newAmount = Math.floor(node.quantity * (1 - normalizedProgress));
  }

  return {
    ...node,
    quantity: newAmount,
    curve: {
      position: newPosition,
      status: isGrowing ? 'growing' : 'decaying',
      ts: now
    }
  };
}
```

## Harvesting Examples

### Example: Flower Patch (3 → 2 flowers)
```typescript
// Initial state: 3 flowers at full growth
const flowerPatch = {
  quantity: 3,
  curve: {
    position: 1.0,              // Fully grown position
    status: 'growing',
    ts: previousTime
  }
};

// Harvest 1 flower
const afterHarvest = harvestResource(FlowerSchema, flowerPatch, 1);

// Result:
// quantity: 2
// curve.position: ~0.67       // Position where logistic curve gives 2/3 progress
// curve.status: 'growing'     // Continue on growth curve
// curve.ts: now              // Fresh timestamp
```

### Different Curve Behaviors After Harvesting

**Logistic Curve (S-curve):**
- Middle amounts regrow fastest (steepest part of S-curve)
- Very low/high amounts regrow slowly (flat parts of S-curve)
- Natural acceleration/deceleration patterns

**Exponential Curve:**
- Faster regrowth at lower amounts
- Progressively slower as approaches capacity
- Good for rapid colonization that slows near limits

**Linear Curve:**
- Constant regrowth rate regardless of current amount
- Predictable timing for players
- Good for resources with steady accumulation

## Environmental Response Patterns

### Seasonal Resource Dynamics
```typescript
// Spring: Cool-weather flowers emerge
// - Wild Trillium starts growing
// - Desert species remain dormant

// Summer: Heat-tolerant species dominate
// - Desert Marigold flourishes
// - Cool-weather species start decaying

// Fall: Late-season bloomers take over
// - Mountain Sunflower peaks
// - Summer species begin decay

// Winter: Hardy species persist
// - Swamp Bracket continues growing
// - Most flowers decay to dormancy
```

### Binary State Transitions
```typescript
// Clear day in spring:
// temperature: 20°C, humidity: 40%, ppfd: 1500
// → Desert Marigold: GROWING (all requirements met)
// → Wild Trillium: DECAYING (too much light)

// Cloudy day in spring:
// temperature: 15°C, humidity: 60%, ppfd: 300
// → Desert Marigold: DECAYING (insufficient light)
// → Wild Trillium: GROWING (shade conditions met)
```

## Key Advantages

1. **Binary Clarity**: Resources are either growing or decaying - no ambiguous states
2. **Immediate Response**: Environmental changes trigger instant state transitions
3. **Curve Continuity**: Position tracking maintains smooth growth patterns
4. **Mathematical Precision**: Exact curve intersection calculations for harvesting
5. **Ecological Realism**: Clear environmental boundaries create natural distributions
6. **Predictable Behavior**: Same curve position always gives same amount
7. **Harvest Integration**: Natural regrowth from mathematically correct positions

## Implementation Guidelines

### Choosing Growth Curves
- **Easing.LOGISTIC**: Most biological growth (flowers, populations)
- **Easing.EXPONENTIAL**: Rapid early growth (fungi, colonization)
- **Easing.LINEAR**: Steady accumulation (minerals, simple resources)
- **Easing.EASE_IN_QUAD**: Accelerating processes (fruit development)
- **Easing.EASE_OUT_QUAD**: Decelerating processes (water filling)

### Environmental Requirements
- Define ALL conditions that must be met for growth
- ANY failed condition triggers decay
- Use tight ranges for ecological specialization
- Combine multiple factors for niche creation

### Duration Settings
- Growth duration: Time from 0 to full capacity
- Decay duration: Time from any amount to 0
- Shorter durations = more responsive to environmental changes
- Longer durations = more stable resource presence

The system creates emergent ecological patterns where environmental conditions determine resource distribution, with each species following its characteristic growth curve while responding immediately to changing conditions through clear binary state transitions.
