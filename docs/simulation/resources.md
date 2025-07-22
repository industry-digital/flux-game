# Resource Generation System

## Overview

The resource generation system provides flora, fungi, and mineral resources across the Flux simulation environment. Resources emerge naturally from place ecosystems based on climate, biome, and weather characteristics, creating realistic resource distribution patterns that drive player exploration, trade, and settlement decisions.

## Design Philosophy

### Resource Categories

The resource system is organized into four main categories:

1. **Trees** - Renewable wood and specialized products
2. **Flowers** - Seasonal blooms with unique properties
3. **Fungi** - Specialized decomposers with magical properties
4. **Minerals** - Geological resources for crafting and technology
5. **Water Bodies** - Dynamic water features affected by weather

Each category has distinct growth patterns, requirements, and yields that create unique gameplay opportunities.

### Weather-Driven Generation

Resources respond dynamically to weather conditions:

- Temperature ranges
- Humidity requirements
- Light levels (PPFD)
- Precipitation needs
- Cloud cover effects
- Fog impacts
- Pressure conditions (for high-altitude resources)

### Time-Based Mechanics

Resources follow natural cycles:

- Seasonal availability
- Day/night preferences
- Lunar phase dependencies
- Growth and decay curves

## Resource Categories in Detail

### Trees

Trees are implemented as bulk resources that represent copses or groves rather than individual trees. Each tree type has specific climate requirements and yields multiple resources.

#### Desert/Arid Trees
- **Mesquite** - Provides wood, bark, nectar
- **Juniper** - Provides wood, bark, berries, resin

#### Grassland Trees
- **Cottonwood** - Provides wood, bark, resin
- **Bur Oak** - Provides wood, bark, nuts

#### Forest Trees
- **Maple** - Provides wood, bark, sap
- **White Birch** - Provides wood, bark, sap
- **White Pine** - Provides wood, bark, resin, nuts

#### Mountain Trees
- **Mountain Pine** - Provides wood, bark, resin, nuts
- **Aspen** - Provides wood, bark

#### Tropical Trees
- **Mahogany** - Provides wood, bark, seeds
- **Rubber Tree** - Provides wood, bark, latex
- **Breadfruit** - Provides wood, bark, fruit

#### Wetland Trees
- **Bald Cypress** - Provides wood, bark
- **Mangrove** - Provides wood, bark

### Flowers

Flowers are implemented with precise environmental requirements and often follow lunar cycles. They provide nectar and specialized products.

#### Desert/Arid Flowers
- **Desert Marigold** - Sun-loving, drought-resistant
- **Desert Lupine** - Spring bloomer in mountain foothills

#### Grassland Flowers
- **Purple Coneflower** - Provides nectar, seeds
- **Black-Eyed Susan** - Summer bloomer
- **Prairie Rose** - Provides nectar, fruit

#### Forest/Mountain Flowers
- **Wild Columbine** - Shade-tolerant mountain flower
- **Wild Trillium** - Forest understory specialist
- **Fireweed** - Pioneer species, provides fiber

#### Alpine Flowers
- **Alpine Aster** - High-altitude specialist
- **Mountain Sunflower** - Meadow species with seeds

#### Tropical Flowers
- **Mountain Passion Vine** - Climbing species
- **Tropical Ginger** - Understory specialist
- **Jungle Orchid** - Canopy epiphyte
- **Black Lotus** - Rare magical species
- **Swamp Orchid** - Wetland specialist

### Fungi

Fungi have unique growth requirements often tied to darkness and moisture. They provide specialized resources and magical components.

#### Desert Fungi
- **Desert Puffball** - Emerges after rain
- **Alpine Bolete** - Mountain specialist

#### Forest Fungi
- **Chanterelle** - Lunar-dependent
- **Cordyceps Gaeatrix** - Parasitic specialist

#### Wetland Fungi
- **Swamp Bracket** - Long-lasting decomposer

#### Generalist Fungi
- **Oyster Mushroom** - Adaptable decomposer
- **Common Puffball** - Widespread species
- **Honey Mushroom** - Aggressive parasite

### Minerals

Minerals are implemented as specimen resources with specific geological requirements. They are organized by technological application.

#### Base Metals
- **Iron** - Primary metal for tools
- **Coal** - Carbon source for steel

#### Steel Alloys
- **Chromium** - Stainless steel component
- **Nickel** - Temperature-resistant alloys
- **Tungsten** - High-hardness tools
- **Molybdenum** - Strength enhancer
- **Vanadium** - Tool steel component
- **Manganese** - Structural component

#### Technology Minerals
- **Silicon** - Electronics component
- **Titanium** - Lightweight structures
- **Cobalt** - High-speed tools
- **Lithium** - Battery technology

#### Piezoelectric Minerals
- **Quartz** - Common piezoelectric
- **Tourmaline** - Complex properties
- **Topaz** - High-quality crystals
- **Beryl** - Advanced applications

### Water Bodies

Water resources are dynamic features that respond to precipitation and climate.

#### Types
- **Large Puddle** - Ephemeral, quick to evaporate
- **Small Pond** - Stable small water body
- **Large Pond** - Significant ecosystem feature
- **Small Lake** - Permanent water feature

## Growth Mechanics

### Growth Curves

Resources use different growth curves based on their type:

- **Linear** - Simple constant growth
- **Logistic** - S-shaped natural growth
- **Exponential** - Rapid multiplication
- **Quadratic** - Accelerating growth
- **Ease Out Quad** - Quick start, gradual finish

### Time Scales

Resources have varying growth and decay periods:

- **Hours** - Water body replenishment
- **Days** - Fungal growth cycles
- **Weeks** - Flower blooming periods
- **Months** - Tree growth
- **Years** - Mineral regeneration

## Integration with Weather

The resource system integrates deeply with weather simulation:

### Temperature Effects
- **Cold-adapted** resources (Alpine species)
- **Heat-tolerant** resources (Desert species)
- **Temperate** resources (Forest/Grassland species)

### Moisture Requirements
- **Drought-resistant** (Desert/Steppe species)
- **Moisture-loving** (Wetland/Tropical species)
- **Moderate** (Temperate species)

### Light Requirements
- **Shade-tolerant** (Forest understory species)
- **Full sun** (Grassland/Desert species)
- **Variable** (Adaptable species)

## Gameplay Implications

### Resource Gathering
- Weather conditions affect resource availability
- Seasonal cycles create harvesting windows
- Lunar phases influence magical resources
- Day/night cycles affect gathering strategies

### Settlement Planning
- Water access is critical for development
- Mineral deposits drive industrial growth
- Tree resources enable construction
- Fungi and flowers provide specialized materials

### Economic Systems
- Resource requirements create trade networks
- Seasonal availability drives market cycles
- Rare resources have high value
- Processing adds value to raw materials

## Future Extensions

### Planned Features
- Resource quality variations
- Processing mechanics
- Crafting systems
- Trading networks

### Potential Additions
- New biome-specific resources
- Advanced weather interactions
- Resource cultivation systems
- Resource transformation chains

## Resource Growth System

We model resource growth using mathematical curves that are pegged to discrete resource capacities. Different resources can use different growth patterns (logistic, exponential, linear, custom) while environmental conditions drive curve parameters in real-time, creating a bottom-up system where natural patterns emerge from simple mathematical rules.

### Resource Schema Structure
```typescript
// Resources have discrete capacities and environmental requirements
type ResourceSchema = {
  name: string;
  provides: string[];           // What this resource yields
  requirements: {               // Environmental conditions for growth
    temperature?: { min?: number, max?: number };
    humidity?: { min?: number, max?: number };
    ppfd?: { min?: number };    // Light requirements
    seasons?: Season[];
    time?: TimeOfDay[];
    // ... other environmental factors
  };
  growth: {
    curve: EasingFunction;      // Defaults to LOGISTIC
    duration: [number, TimeUnit]; // Time to reach 100% capacity
  };
  quantity: {
    measure: UnitOfMeasure;
    capacity: number;           // Hard cap (e.g., 100 flowers max)
  };
}
```

### Mathematical Foundation

#### Growth Curve Pegged to Capacity
```typescript
// Any growth curve can be normalized to resource capacity
function calculateResourceAmount(
  resource: ResourceSchema,
  environmentalConditions: EnvironmentalState,
  curveTime: number
): number {
  const effectiveRate = calculateEnvironmentalMultiplier(
    resource.requirements,
    environmentalConditions
  );

  // Apply the specified easing function (logistic, exponential, linear, etc.)
  const normalizedProgress = applyEasingFunction(
    resource.growth.curve,
    curveTime,
    effectiveRate
  );

  // Scale to resource capacity: curve goes from 0 to capacity
  const curveValue = normalizedProgress * resource.quantity.capacity;

  // Current discrete amount
  return Math.floor(curveValue);
}

// Generic easing function application
function applyEasingFunction(
  curve: EasingFunction,
  time: number,
  rate: number
): number {
  switch (curve) {
    case Easing.LOGISTIC:
      return 1 / (1 + Math.exp(-rate * time));

    case Easing.EXPONENTIAL:
      return 1 - Math.exp(-rate * time);

    case Easing.LINEAR:
      return Math.min(1, rate * time);

    case Easing.CUBIC:
      const t = Math.min(1, rate * time);
      return t * t * (3 - 2 * t);

    case Easing.POWER:
      return Math.min(1, Math.pow(rate * time, 2));

    default:
      return Math.min(1, rate * time); // Fallback to linear
  }
}
```

#### Environmental Multiplier Calculation
```typescript
function calculateEnvironmentalMultiplier(
  requirements: ResourceGrowthRequirements,
  conditions: EnvironmentalState
): number {
  let multiplier = 1.0;

  // Temperature factor
  if (requirements.temperature) {
    multiplier *= calculateRangeMultiplier(
      conditions.temperature,
      requirements.temperature.min,
      requirements.temperature.max
    );
  }

  // Humidity factor
  if (requirements.humidity) {
    multiplier *= calculateRangeMultiplier(
      conditions.humidity,
      requirements.humidity.min,
      requirements.humidity.max
    );
  }

  // Light factor (PPFD)
  if (requirements.ppfd) {
    multiplier *= Math.min(1.0, conditions.ppfd / requirements.ppfd.min);
  }

  // Seasonal factor
  if (requirements.seasons && !requirements.seasons.includes(conditions.season)) {
    multiplier = 0; // No growth outside preferred seasons
  }

  return multiplier;
}
```

## Example: Different Growth Patterns

```typescript
// Logistic growth - classic S-curve (slow start, fast middle, slow end)
export const WildRoseSchema = createResourceSchema({
  name: 'wild rose',
  growth: {
    curve: Easing.LOGISTIC,
    duration: [2, TimeUnit.WEEK]
  },
  quantity: { capacity: 12 }
});

// Exponential growth - rapid early growth, levels off (good for fungi)
export const MushroomSchema = createResourceSchema({
  name: 'mushroom',
  growth: {
    curve: Easing.EXPONENTIAL,
    duration: [3, TimeUnit.DAY]
  },
  quantity: { capacity: 8 }
});

// Linear growth - steady constant rate (good for grass, leaves)
export const PrairieGrassSchema = createResourceSchema({
  name: 'prairie grass',
  growth: {
    curve: Easing.LINEAR,
    duration: [1, TimeUnit.MONTH]
  },
  decay: {
    curve: Easing.EASE_IN_QUAD,
    duration: [3, TimeUnit.MONTH]
  },
  quantity: { capacity: 500 }
});

// Power curve - accelerating growth (good for fruit trees)
export const AppleTreeSchema = createResourceSchema({
  name: 'apple tree',
  growth: {
    curve: Easing.POWER,
    duration: [4, TimeUnit.MONTH]
  },
  quantity: { capacity: 20 }
});
```

## Harvesting Model

### Curve Position Reset Approach (Universal)
```typescript

export type ResourceNodeState = {
  quantity: number;
  quality: number;
  fullness: NormalizedValueBetweenZeroAndOne;
  last: {
    growth: number; // timestamp
    decay: number; // timestamp
  };
};

export type ResourceNodeStateWithTimestamp = ResourceNodeState & {
  ts: number;
};
export type ResourceNodes = {
  /**
   * When the resources were last updated
   */
  ts: number;

  /**
   * The resource nodes that are present
   */
  nodes: Partial<Record<ResourceURN, ResourceNodeState>>;
};

function getCurrentVisibleAmount(
  node: ResourceNode,
  conditions: EnvironmentalState
): number {
  const effectiveRate = calculateEnvironmentalMultiplier(
    node.schema.requirements,
    conditions
  );

  // Calculate curve value at current position using specified easing function
  const normalizedProgress = applyEasingFunction(
    node.schema.growth.curve,
    node.curveTime,
    effectiveRate
  );

  const curveValue = normalizedProgress * node.schema.quantity.capacity;
  return Math.floor(curveValue);
}

function harvestResource(
  node: ResourceNode,
  harvestedAmount: number,
  conditions: EnvironmentalState
): ResourceNode {
  const newAmount = node.currentAmount - harvestedAmount;

  // Find the curve time that corresponds to the new amount for ANY curve type
  const newCurveTime = findCurveTimeForAmount(
    node.schema,
    newAmount,
    conditions
  );

  return {
    ...node,
    currentAmount: newAmount,
    curveTime: newCurveTime
  };
}

function findCurveTimeForAmount(
  schema: ResourceSchema,
  targetAmount: number,
  conditions: EnvironmentalState
): number {
  const effectiveRate = calculateEnvironmentalMultiplier(
    schema.requirements,
    conditions
  );
  const targetProgress = targetAmount / schema.quantity.capacity;

  // Use inverse functions for different curve types
  switch (schema.growth.curve) {
    case Easing.LOGISTIC:
      return Math.log((1 - targetProgress) / targetProgress) / (-effectiveRate);

    case Easing.EXPONENTIAL:
      return -Math.log(1 - targetProgress) / effectiveRate;

    case Easing.LINEAR:
      return targetProgress / effectiveRate;

    case Easing.CUBIC:
      // Numerical solution for cubic inverse (more complex)
      return solveCubicInverse(targetProgress, effectiveRate);

    case Easing.POWER:
      return Math.pow(targetProgress, 1/2) / effectiveRate;

    default:
      return targetProgress / effectiveRate; // Fallback to linear
  }
}

function updateResourceGrowth(
  node: ResourceNode,
  conditions: EnvironmentalState,
  deltaTime: number
): ResourceNode {
  const effectiveRate = calculateEnvironmentalMultiplier(
    node.schema.requirements,
    conditions
  );

  // Advance along the curve based on environmental conditions
  const newCurveTime = node.curveTime + (effectiveRate * deltaTime);

  const normalizedProgress = applyEasingFunction(
    node.schema.growth.curve,
    newCurveTime,
    effectiveRate
  );

  const newAmount = Math.floor(normalizedProgress * node.schema.quantity.capacity);

  return {
    ...node,
    curveTime: newCurveTime,
    currentAmount: Math.min(newAmount, node.schema.quantity.capacity)
  };
}
```

## Harvesting Example: Different Curve Behaviors

### Logistic Curve (S-curve): 3 Flowers → 2 Flowers
```typescript
// Initial state: 3 flowers, classic S-curve growth
const flowerPatch = {
  schema: { growth: { curve: Easing.LOGISTIC }, capacity: 3 },
  currentAmount: 3,
  curveTime: 2.5  // Point where logistic curve = 1.0 (100% progress)
};

// After harvesting 1 flower:
// - Find time where logistic(t) * 3 = 2
// - Continue growth from that intersection point
```

### Exponential Curve: 5 Mushrooms → 3 Mushrooms
```typescript
// Initial state: 5 mushrooms, exponential growth pattern
const mushroomPatch = {
  schema: { growth: { curve: Easing.EXPONENTIAL }, capacity: 5 },
  currentAmount: 5,
  curveTime: 4.2  // Point where exponential curve reaches capacity
};

// After harvesting 2 mushrooms:
// - Find time where (1 - e^(-rate * t)) * 5 = 3
// - Continue exponential growth from that point
```

### Linear Curve: 100 Grass → 75 Grass
```typescript
// Initial state: 100 grass stalks, steady linear growth
const grassPatch = {
  schema: { growth: { curve: Easing.LINEAR }, capacity: 100 },
  currentAmount: 100,
  curveTime: 10.0  // Point where linear progression reaches 100%
};

// After harvesting 25 grass:
// - Find time where (rate * t) * 100 = 75
// - Continue linear growth from that point
```

### Universal Mathematical Process
```
For ANY curve type:
1. Calculate targetProgress = newAmount / capacity
2. Use inverse function to find curve time for that progress level
3. Continue growth from that curve time forward

Curve Types and Their Inverses:
- Logistic: t = ln((1-p)/p) / (-rate)
- Exponential: t = -ln(1-p) / rate
- Linear: t = p / rate
- Power: t = p^(1/n) / rate
- Custom: Numerical inverse solving
```

## Environmental Response Examples

### Good Conditions: Accelerated Growth
```typescript
// Perfect desert marigold weather
const conditions = {
  temperature: 25,      // Optimal range
  humidity: 30,         // Perfect for desert flower
  ppfd: 1500,          // High desert sun
  season: 'spring',     // Growing season
  time: 'day'          // Active time
};
// Environmental multiplier = 1.0 (full growth rate)
```

### Poor Conditions: Stunted Growth
```typescript
// Suboptimal conditions
const conditions = {
  temperature: 10,      // Too cold (below 15°C min)
  humidity: 60,         // Too humid (above 45% max)
  ppfd: 800,           // Insufficient light
  season: 'winter',     // Wrong season
  time: 'night'        // Wrong time
};
// Environmental multiplier = 0.0 (no growth)
```

### Marginal Conditions: Slow Growth
```typescript
// Borderline conditions
const conditions = {
  temperature: 16,      // Just above minimum
  humidity: 44,         // Near maximum tolerance
  ppfd: 1250,          // Adequate light
  season: 'summer',     // Correct season
  time: 'morning'      // Correct time
};
// Environmental multiplier = ~0.3 (slow growth)
```

## Resource Distribution Patterns

### Natural Ecological Niches
```typescript
// Different flowers emerge in different conditions automatically:

// Hot, dry, sunny areas → Desert Marigold dominates
// Cool, humid, shaded areas → Wild Trillium thrives
// Moderate grasslands → Purple Coneflower proliferates
// Tropical, humid jungle → Orchids flourish

// No manual placement needed - environmental requirements
// create natural distribution patterns
```

### Seasonal Dynamics
```typescript
// Spring: Cool-weather flowers emerge first
// Summer: Heat-tolerant species dominate
// Fall: Late-season bloomers take over
// Winter: Most flowers dormant, only hardy species persist

// Transitions happen automatically as conditions change
```

## Update Frequency Considerations

### Time-Independent Evaluation
```typescript
// This function always gives same result regardless of sampling frequency
function updateResourceNodes(nodes: ResourceNode[], conditions: EnvironmentalState): ResourceNode[] {
  const currentTime = Date.now();

  return nodes.map(node => ({
    ...node,
    currentAmount: getCurrentVisibleAmount(node, conditions, currentTime)
  }));
}

// Can be called every second, minute, or hour - same mathematical result
```

### Recommended Update Strategy
```typescript
// Environmental condition changes: 1-2 minutes (responsive)
// Resource amount recalculation: 5-15 minutes (efficient)
// Player location updates: 30 seconds - 2 minutes (noticeable)
```

## Key Advantages

1. **Time-Independent**: Same result regardless of update frequency
2. **Environmentally Responsive**: Growth immediately responds to condition changes
3. **Mathematically Clean**: Pure function evaluation, no complex state tracking
4. **Capacity Constrained**: Hard limits enforced mathematically
5. **Realistic Patterns**: Natural S-curve acceleration and saturation
6. **Emergent Distribution**: Environmental niches create natural resource zones
7. **No Integration Errors**: Avoids cumulative sampling frequency problems

## Usage Guidelines

- Choose appropriate `curve` types based on biological reality:
  - `Easing.LOGISTIC` for most natural growth (flowers, trees, populations)
  - `Easing.EXPONENTIAL` for rapid early growth that levels off (fungi, bacteria)
  - `Easing.LINEAR` for steady constant growth (grass, continuous resources)
  - `Easing.POWER` for accelerating growth (fruit development, seasonal resources)
  - Custom curves for specialized growth patterns

- Set `capacity` to realistic maximums for the resource type
- Define tight environmental `requirements` to create distinct ecological niches
- Growth `duration` should reflect real-world growth timescales
- `description` functions should reflect the `fullness` ratio dynamically
- Environmental requirements create natural resource distribution without manual placement

## Implementation Notes

- The growth curve represents "what nature wants to be there" based on environmental support
- Harvesting finds the intersection point on the curve and continues growth from that position
- Resources regrow when the curve naturally progresses beyond the harvested amount
- Poor environmental conditions slow or stop curve progression
- Excellent conditions accelerate curve progression, enabling rapid recovery after harvesting
- Different curve types create different regrowth behaviors:
  - Logistic: Slow early regrowth, then rapid recovery, then slow final approach
  - Exponential: Rapid initial regrowth that slows as it approaches original amount
  - Linear: Steady constant regrowth rate
  - Power: Slow initial regrowth that accelerates toward full recovery

The system creates emergent resource distribution patterns where environmental conditions naturally determine what grows where, with each resource type following its biologically appropriate growth curve.
