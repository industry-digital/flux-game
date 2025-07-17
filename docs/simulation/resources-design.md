# Resource Generation System Design

## Overview

The Resource Generation System forms the critical **ecological bridge** between atmospheric conditions (Weather) and biological behavior (Creatures) in our digital biosphere. Resources translate raw environmental energy into biologically meaningful availability, creating the foundation for much of the basis for 1) creature behavior, and 2) the economy.

**Core Principle**: Resources are **environmental responses** - they grow, decline, and redistribute based purely on atmospheric and geological conditions, with no knowledge of the creatures that depend on them (with few exceptions).

## What is a "Resource" in Our System?

### Definition

A **resource** is any **biologically or economically valuable tangible substance** that:
1. **Exists in specific locations** (Places in the world)
2. **Responds to environmental conditions** (weather patterns)
3. **Has dynamic availability** (grows, depletes, regenerates)
4. **Influences creature behavior** (indirectly, through scarcity/abundance)

### Taxonomic Resource Organization

Resources are organized in our **hierarchical taxonomy system**:

```typescript
// Biological Resources
flux:resource:fruit:berries                // Temperate fruit
flux:resource:fruit:cactus                 // Arid fruit
flux:resource:seed:acorn                   // Forest nuts
flux:resource:bark:willow                  // Medicinal bark
flux:resource:fiber:cotton                 // Temperate fiber
flux:resource:fiber:yucca                  // Arid fiber
flux:resource:wood:oak                     // Hardwood

// Geological Resources
flux:resource:mineral:salt                 // Evaporative mineral
flux:resource:mineral:copper               // Ore deposit
flux:resource:mineral:lithium              // Battery metal
flux:resource:stone:granite                // Construction stone
```

### Taxonomic Behavior Inheritance

Rather than defining individual species behaviors, resources inherit behaviors **hierarchically** from their taxonomic classification, creating biologically authentic patterns while maintaining system elegance.

## Taxonomic Behavior System

### **Hierarchical Behavior Definition**

```typescript
const ResourceBehaviors = {
  // All resources share fundamental properties
  'flux:resource': {
    baseGrowthRate: 0.001,
    temperatureRange: [-10, 50],
    baseCarryingCapacity: 1000,
    regenerationEnabled: true
  },

  // Fruits share reproductive cycling and biological traits
  'flux:resource:fruit': {
    lightDependency: 0.8,        // High photosynthetic dependence
    seasonalVariation: true,      // Follow seasonal cycles
    weatherResponsive: true,      // Respond to weather changes
    moistureDependency: 0.7,      // Need adequate water
    biologicalGrowth: true,
    seasonalPeaking: 'summer',    // Peak production in summer
    temperatureOptimal: [15, 30], // Optimal growing temperature
    reproductiveCycle: true,      // Seasonal fruiting cycles
    pollination: true            // May require pollinators
  },

  // Seeds follow different seasonal patterns
  'flux:resource:seed': {
    lightDependency: 0.6,        // Moderate light needs for germination
    seasonalVariation: true,      // Follow seasonal cycles
    weatherResponsive: true,      // Weather influences germination
    moistureDependency: 0.8,      // High water needs for sprouting
    biologicalGrowth: true,
    seasonalPeaking: 'autumn',    // Seeds mature in fall
    temperatureOptimal: [10, 25], // Cooler optimal range
    dormancyPeriod: true,        // Winter dormancy
    germinationTriggers: true     // Specific germination conditions
  },

  // Bark resources from living trees
  'flux:resource:bark': {
    lightDependency: 0.7,        // Indirect light dependency (through tree)
    seasonalVariation: true,      // Tree growth affects bark availability
    weatherResponsive: true,      // Weather affects tree health
    moistureDependency: 0.6,      // Moderate water needs
    biologicalGrowth: true,
    slowGrowth: true,            // Very slow regeneration
    seasonalPeaking: 'spring',    // Best harvest when sap flows
    temperatureOptimal: [5, 25],  // Cool to moderate temperatures
    medicinalProperties: true     // Often medicinal
  },

  // Fibers have continuous growth patterns
  'flux:resource:fiber': {
    lightDependency: 0.8,        // High photosynthetic dependence
    seasonalVariation: true,      // Follow growing seasons
    weatherResponsive: true,      // Weather greatly affects quality
    moistureDependency: 0.8,      // High water needs
    biologicalGrowth: true,
    continuousGrowth: true,       // Grow throughout season
    temperatureOptimal: [10, 35], // Wide temperature tolerance
    harvestable: true,           // Can be actively harvested
    fiberStrength: 1.0           // Base fiber quality
  },

  // Wood follows tree growth patterns
  'flux:resource:wood': {
    lightDependency: 0.7,        // Trees need light
    seasonalVariation: true,      // Annual growth rings
    weatherResponsive: true,      // Weather affects growth
    moistureDependency: 0.6,      // Moderate water needs
    biologicalGrowth: true,
    slowGrowth: true,            // Very slow growth rate
    temperatureOptimal: [5, 30],  // Wide range for trees
    seasonalRings: true,         // Annual growth rings
    matureHarvest: true,         // Best when mature
    harvestable: true            // Can be logged
  },

  // All minerals follow geological processes
  'flux:resource:mineral': {
    lightDependency: 0.0,        // No photosynthesis
    weatherResponsive: false,     // Weather-independent base growth
    geologicalProcess: true,      // Follow geological time scales
    baseGrowthRate: 0.0001,      // Very slow accumulation
    exposureDependent: true       // Exposed by weathering
  },

  // Stone resources from geological processes
  'flux:resource:stone': {
    lightDependency: 0.0,        // No biological growth
    weatherResponsive: true,      // Weathering exposes stone
    geologicalProcess: true,      // Geological formation
    baseGrowthRate: 0.00001,     // Extremely slow formation
    exposureDependent: true,      // Exposed by erosion
    harvestable: true,           // Can be quarried
    weatheringRate: 0.1          // Rate of exposure through weathering
  }
};
```

### **Unit of Measure Definitions**

Each taxonomic level defines appropriate units of measure that inherit down the hierarchy. The system uses both simple `UnitOfMeasure` enum values and full `DimensionURN` taxonomic identifiers:

```typescript
const ResourceUnits = {
  // Base resource units - mass by default
  'flux:resource': {
    uom: UnitOfMeasure.MASS_KG,
    dimensionURN: 'flux:dimension:mass:kilogram',
    description: 'Default mass measurement for resource quantities'
  },

  // Fruits often measured by individual count or mass
  'flux:resource:fruit': {
    uom: UnitOfMeasure.EACH,
    dimensionURN: 'flux:dimension:count:each',
    description: 'Individual fruit counting for discrete harvests',
    alternativeUnits: [
      {
        uom: UnitOfMeasure.MASS_GRAMS,
        dimensionURN: 'flux:dimension:mass:gram',
        context: 'bulk harvesting'
      }
    ]
  },

  // Seeds typically counted individually
  'flux:resource:seed': {
    uom: UnitOfMeasure.EACH,
    dimensionURN: 'flux:dimension:count:each',
    description: 'Individual seed counting for planting/consumption'
  },

  // Rare botanical resources - discrete items with quality measurements
  'flux:resource:root': {
    uom: UnitOfMeasure.EACH,
    dimensionURN: 'flux:dimension:count:each',
    description: 'Individual rare root harvesting',
    qualityUnits: {
      uom: UnitOfMeasure.MASS_GRAMS,
      dimensionURN: 'flux:dimension:mass:gram',
      context: 'root mass determines potency and value'
    }
  },

  'flux:resource:root:sansam': {
    uom: UnitOfMeasure.EACH,
    dimensionURN: 'flux:dimension:count:each',
    description: 'Single golden sansam root harvesting',
    qualityUnits: {
      uom: UnitOfMeasure.MASS_GRAMS,
      dimensionURN: 'flux:dimension:mass:gram',
      context: 'root size determines alchemical potency'
    }
  },

  // Bark measured by mass for medicinal preparations
  'flux:resource:bark': {
    uom: UnitOfMeasure.MASS_GRAMS,
    dimensionURN: 'flux:dimension:mass:gram',
    description: 'Fine mass measurement for medicinal bark preparations'
  },

  // Fibers measured by mass (for production) or length (for quality)
  'flux:resource:fiber': {
    uom: UnitOfMeasure.MASS_GRAMS,
    dimensionURN: 'flux:dimension:mass:gram',
    description: 'Fine mass measurement for fiber production',
    qualityUnits: {
      uom: UnitOfMeasure.DISTANCE_METERS,
      dimensionURN: 'flux:dimension:length:meter',
      context: 'fiber length for quality assessment'
    }
  },

  // Wood measured by volume or mass depending on context
  'flux:resource:wood': {
    uom: UnitOfMeasure.VOLUME_LITERS,
    dimensionURN: 'flux:dimension:volume:liter',
    description: 'Volume measurement for lumber and timber',
    alternativeUnits: [
      {
        uom: UnitOfMeasure.MASS_KG,
        dimensionURN: 'flux:dimension:mass:kilogram',
        context: 'weight-based trading'
      }
    ]
  },

  // Minerals typically measured by mass
  'flux:resource:mineral': {
    uom: UnitOfMeasure.MASS_KG,
    dimensionURN: 'flux:dimension:mass:kilogram',
    description: 'Standard mass measurement for mineral deposits'
  },

  // Stone measured by mass or volume for construction
  'flux:resource:stone': {
    uom: UnitOfMeasure.MASS_KG,
    dimensionURN: 'flux:dimension:mass:kilogram',
    description: 'Mass measurement for stone blocks and construction materials',
    alternativeUnits: [
      {
        uom: UnitOfMeasure.VOLUME_LITERS,
        dimensionURN: 'flux:dimension:volume:liter',
        context: 'quarried stone blocks'
      }
    ]
  },

  // Precious metals might use smaller units
  'flux:resource:mineral:precious': {
    uom: UnitOfMeasure.MASS_GRAMS,
    dimensionURN: 'flux:dimension:mass:gram',
    description: 'Fine mass measurement for precious metals and gems'
  }
};
```

### **Unit Resolution System**

```typescript
function getResourceUnits(resourceURN: ResourceURN): ResourceUnits {
  const taxonomyPath = resourceURN.split(':');
  let units = ResourceUnits['flux:resource']; // Default base units

  // Inherit units from general to specific
  for (let i = 1; i <= taxonomyPath.length; i++) {
    const taxonomyLevel = taxonomyPath.slice(0, i).join(':');

    if (ResourceUnits[taxonomyLevel]) {
      units = { ...units, ...ResourceUnits[taxonomyLevel] };
    }
  }

  return units;
}

// Example usage:
// flux:resource:fruit:berries -> UnitOfMeasure.EACH, 'flux:dimension:count:each'
// flux:resource:wood:oak -> UnitOfMeasure.VOLUME_LITERS, 'flux:dimension:volume:liter'
// flux:resource:mineral:copper -> UnitOfMeasure.MASS_KG, 'flux:dimension:mass:kilogram'
```

### **Unit Conversion & Context**

Resources can have **context-dependent units** for different situations:

```typescript
type ResourceQuantity = {
  amount: number;
  uom: UnitOfMeasure;
  dimensionURN: DimensionURN;
  context?: 'harvesting' | 'trading' | 'storage' | 'quality';
};

// Example: Cotton fiber
const cottonHarvest: ResourceQuantity = {
  amount: 250,
  uom: UnitOfMeasure.MASS_GRAMS,
  dimensionURN: 'flux:dimension:mass:gram',
  context: 'harvesting'
};

const cottonQuality: ResourceQuantity = {
  amount: 15.5,
  uom: UnitOfMeasure.DISTANCE_CENTIMETERS,
  dimensionURN: 'flux:dimension:length:centimeter',
  context: 'quality' // fiber length determines quality
};
```

### **Dual-Layer Architecture: Simulation vs Presentation**

The system maintains **two distinct layers** that serve different purposes:

#### **Simulation Layer** (Precise & Mathematical)
- **Purpose**: Accurate resource tracking for game mechanics
- **Format**: Exact quantities with proper units
- **Usage**: Weather effects, growth calculations, creature consumption
- **Example**: `quantity: 2300, uom: 'flux:dimension:mass:gram'`

#### **Presentation Layer** (Narrative & Immersive)
- **Purpose**: Player-facing descriptions of world objects
- **Format**: Natural language descriptions of what players see
- **Usage**: User interfaces, exploration descriptions, inventory
- **Example**: `"a cotton plant, ready for harvest"`

```typescript
// Refined ResourceNode with support for multi-dimensional resources
type ResourceNode = AbstractResource & {
  // Primary dimension - what you harvest
  quantity: number;              // Count or primary amount
  uom: DimensionURN;            // Primary unit (e.g., 'flux:dimension:count:each')

  // Secondary dimension - quality/size measure (optional)
  qualityMeasure?: number;       // Size, mass, potency, etc.
  qualityUom?: DimensionURN;     // Quality unit (e.g., 'flux:dimension:mass:gram')

  // Bridge layer - connects simulation to presentation
  fullness: number;             // 0.0-1.0 ratio for description generation

  // Presentation layer - player experience
  label: string;                // Generated narrative description using taxonomic vocabulary
};
```

#### **Label Generation Flow**

```typescript
function updateResourceNode(node: ResourceNode, context: ResourceContext): ResourceNode {
  // 1. Update simulation quantities/quality (weather effects, growth, consumption)
  const updatedNode = calculateResourceGrowth(node, context);

  // 2. Calculate fullness ratio (simulation -> bridge layer)
  const newFullness = calculateFullness(updatedNode, context);

  // 3. Generate presentation label using taxonomic vocabulary (bridge -> presentation layer)
  const newLabel = generateResourceLabel(updatedNode.urn, newFullness, context.location, context.season);

  return {
    ...updatedNode,
    fullness: newFullness,        // Bridge layer: 0-1 ratio
    label: newLabel              // Presentation layer: narrative description
  };
}

// Fullness calculation handles both single and multi-dimensional resources
function calculateFullness(node: ResourceNode, context: ResourceContext): number {
  const behavior = getResourceBehavior(node.urn);

  // For multi-dimensional resources (quality-based), use qualityMeasure
  if (node.qualityMeasure !== undefined) {
    const maxQuality = calculateMaxQuality(node, behavior, context);
    return Math.max(0, Math.min(1, node.qualityMeasure / maxQuality));
  }

  // For standard resources, use quantity
  const maxCapacity = calculateMaxCapacity(node, behavior, context);
  return Math.max(0, Math.min(1, node.quantity / maxCapacity));
}

// Example multi-dimensional resource creation
const goldenSansam: ResourceNode = createResourceNode(
  'flux:resource:root:sansam',
  1,                           // Always harvest exactly 1 root (quantity)
  'flux:place:forest:hidden-grove',
  { season: 'autumn', location: 'forest' }
);

// Simulation updates both dimensions:
goldenSansam.quantity = 1;                    // Always 1 (you get one root)
goldenSansam.uom = 'flux:dimension:count:each';
goldenSansam.qualityMeasure = 275;           // 275 grams (high quality)
goldenSansam.qualityUom = 'flux:dimension:mass:gram';
goldenSansam.fullness = 0.92;                // 92% of maximum possible size

// Result label: "a fully matured golden sansam root"

// Quality progression over time for the same sansam root:
// Week 1: qualityMeasure=45g,  fullness=0.15 → "a tiny golden sansam root"
// Week 8: qualityMeasure=120g, fullness=0.40 → "a growing golden sansam root"
// Week 16: qualityMeasure=200g, fullness=0.67 → "a substantial golden sansam root"
// Week 24: qualityMeasure=275g, fullness=0.92 → "a fully matured golden sansam root"

// The player always harvests exactly 1 root, but its value varies dramatically based on timing
```

This architecture allows:
- **Creatures** to make decisions based on precise resource availability
- **Weather systems** to apply exact mathematical effects
- **Players** to experience an immersive, living world
- **Game balance** through precise resource tracking
- **Narrative richness** through contextual descriptions

### **Integration with ResourceNode**

The dual-layer architecture integrates perfectly with the existing `ResourceNode` type:

```typescript
// From game/src/types/entity/resource.ts - enhanced for dual-layer approach
export type ResourceNode = AbstractResource & {
  quantity: number;    // Simulation layer - precise tracking
  uom: DimensionURN;   // Simulation layer - proper units
  label: string;       // Presentation layer - narrative description
};

// Enhanced resource creation with taxonomic vocabulary system
function createResourceNode(
  resourceURN: ResourceURN,
  quantity: number,
  location: PlaceURN,
  context: ResourceContext
): ResourceNode {
  const units = getResourceUnits(resourceURN);
  const behavior = getResourceBehavior(resourceURN);

  // Calculate fullness based on resource type and context
  const tempNode = { urn: resourceURN, quantity } as ResourceNode;
  const fullness = calculateFullness(tempNode, context);

  // Generate narrative label using taxonomic vocabulary
  const label = generateResourceLabel(resourceURN, fullness, location, context.season);

  return {
    id: generateId(),
    urn: resourceURN,
    location,
    // Simulation layer - precise tracking
    quantity,                                    // Exact amount for calculations
    uom: units.dimensionURN,                    // Proper unit for math

    // Optional secondary dimension for quality-based resources
    ...(units.qualityUnits ? {
      qualityMeasure: calculateInitialQuality(resourceURN, context),
      qualityUom: units.qualityUnits.dimensionURN
    } : {}),

    // Bridge layer - connects simulation to presentation
    fullness,                                   // 0-1 ratio for vocabulary selection
    // Presentation layer - immersive experience
    label,                                      // Domain-specific narrative description
    // ... other AbstractResource properties
  };
}

// Example: Creating different resource types with taxonomic vocabularies

const berryBush: ResourceNode = createResourceNode(
  'flux:resource:fruit:berries',
  47, // 47 individual berries (simulation layer)
  'flux:place:tom-bombadils-forest:clearing:berry-patch',
  {
    season: 'summer',    // Atomic value - intersects with existing URNs
    location: 'forest'   // Atomic value - intersects with existing URNs
  }
);
// Result:
// - quantity: 47, uom: 'flux:dimension:count:each' (simulation: precise tracking)
// - fullness: 0.82 (bridge: calculated from capacity model)
// - label: "a berry bush, heavy with berries" (presentation: botanical vocabulary)

const copperVein: ResourceNode = createResourceNode(
  'flux:resource:mineral:copper',
  5000, // 5000 grams remaining copper ore (simulation layer)
  'flux:place:mountain:copper-mine',
  {
    season: 'spring',   // Atomic value - intersects to form vocabulary paths
    location: 'mountain' // Atomic value - intersects to form vocabulary paths
  }
);
// Result:
// - quantity: 5000, uom: 'flux:dimension:mass:gram' (simulation: precise tracking)
// - fullness: 0.08 (bridge: nearly depleted based on geological model)
// - label: "an exposed copper vein, mostly worked out" (presentation: geological + seasonal vocabulary)

const ancientOak: ResourceNode = createResourceNode(
  'flux:resource:wood:oak',
  12500, // 12.5 liters of prime timber (simulation layer)
  'flux:place:forest:oak-grove',
  {
    season: 'autumn',   // Atomic value - intersects to form vocabulary paths
    location: 'forest'  // Atomic value - intersects to form vocabulary paths
  }
);
// Result:
// - quantity: 12500, uom: 'flux:dimension:volume:liter' (simulation: precise tracking)
// - fullness: 0.95 (bridge: nearly at maximum maturity)
// - label: "an ancient oak, autumn-colored in old growth forest" (presentation: botanical + seasonal + biome vocabulary)

// This matches the examples from the ResourceNode type definition:
// ✓ "A rubber tree, oozing with latex" - botanical vocabulary for tree resources
// ✓ "A beehive, brimming with honey" - apiary vocabulary for bee-produced resources
// ✓ "A copper mine with a few remaining veins" - geological vocabulary for mineral extraction
// ✓ "A berry bush that has been picked clean" - agricultural vocabulary for harvestable plants
```

### **Taxonomic Description Vocabularies**

Each resource type uses **domain-specific descriptive language** that reflects how people actually talk about those resources. The vocabulary is inherited taxonomically and driven by the `fullness` property (0-1 range):

```typescript
type ResourceState = {
  fullness: number;               // 0.0 to 1.0 from ResourceNode
  maturity: 'young' | 'mature' | 'aged' | 'ancient';
  quality: 'poor' | 'fair' | 'good' | 'excellent' | 'legendary';
  season: 'dormant' | 'budding' | 'blooming' | 'fruiting' | 'withering';
};

type DescriptionVocabulary = {
  containerName: string;          // "berry bush", "beehive", "ore vein"
  resourceName: string;           // "berries", "honey", "copper"

  // Fullness-based descriptors (indexed by fullness ranges)
  abundanceDescriptors: {
    depleted: string[];           // fullness: 0.0-0.1
    sparse: string[];             // fullness: 0.1-0.3
    moderate: string[];           // fullness: 0.3-0.7
    abundant: string[];           // fullness: 0.7-0.9
    overflowing: string[];        // fullness: 0.9-1.0
  };

  // Quality/maturity modifiers
  qualityDescriptors: string[];   // ["ancient", "golden", "prime"]
  seasonalDescriptors: string[];  // ["budding", "in bloom", "dormant"]
};

function generateResourceLabel(
  resourceURN: ResourceURN,
  fullness: number,
  location: PlaceURN,
  season: string
): string {
  const vocabulary = getDescriptionVocabulary(resourceURN);
  const state = calculateResourceState(fullness, season);

  return buildNarrativeLabel(vocabulary, state);
}

// Taxonomic Description Vocabularies - inherited down the hierarchy
const TaxonomicVocabularies: Record<string, DescriptionVocabulary> = {
  // Base biological vocabulary
  'flux:resource:fruit': {
    containerName: 'fruit tree',
    resourceName: 'fruit',
    abundanceDescriptors: {
      depleted: ['picked clean', 'barren', 'stripped bare'],
      sparse: ['with few remaining fruit', 'sparsely fruited', 'nearly picked over'],
      moderate: ['bearing fruit', 'with modest harvest', 'showing fruit'],
      abundant: ['heavy with fruit', 'laden with produce', 'richly fruited'],
      overflowing: ['bursting with fruit', 'drooping under the weight', 'overwhelmed with harvest']
    },
    qualityDescriptors: ['wild', 'cultivated', 'ancient', 'young'],
    seasonalDescriptors: ['in bloom', 'fruiting', 'dormant', 'budding']
  },

  'flux:resource:fruit:berries': {
    containerName: 'berry bush',
    resourceName: 'berries',
    abundanceDescriptors: {
      depleted: ['picked clean', 'stripped of berries', 'barren'],
      sparse: ['with a few remaining berries', 'nearly picked over'],
      moderate: ['dotted with berries', 'showing clusters of fruit'],
      abundant: ['heavy with berries', 'thick with clusters'],
      overflowing: ['bursting with ripe berries', 'drooping under berry weight']
    },
    qualityDescriptors: ['wild', 'thorny', 'sweet'],
    seasonalDescriptors: ['in bloom', 'ripening', 'dormant']
  },

  // Geological vocabulary uses different language entirely
  'flux:resource:mineral': {
    containerName: 'ore deposit',
    resourceName: 'ore',
    abundanceDescriptors: {
      depleted: ['mostly mined out', 'with exhausted veins', 'showing only traces'],
      sparse: ['with thin veins', 'showing modest deposits', 'lightly mineralized'],
      moderate: ['with decent veins', 'moderately rich', 'showing good ore'],
      abundant: ['with rich veins', 'heavily mineralized', 'showing abundant ore'],
      overflowing: ['with massive deposits', 'extremely rich', 'thick with veins']
    },
    qualityDescriptors: ['exposed', 'hidden', 'weathered', 'fresh'],
    seasonalDescriptors: ['accessible', 'snow-covered', 'flooded', 'exposed']
  },

  'flux:resource:mineral:copper': {
    containerName: 'copper vein',
    resourceName: 'copper ore',
    abundanceDescriptors: {
      depleted: ['mostly worked out', 'with only traces remaining', 'nearly exhausted'],
      sparse: ['with thin copper veins', 'showing modest copper'],
      moderate: ['with decent copper deposits', 'moderately rich in copper'],
      abundant: ['rich with copper veins', 'heavy with ore'],
      overflowing: ['gleaming with copper deposits', 'extremely rich veins']
    },
    qualityDescriptors: ['green-stained', 'pure', 'oxidized', 'native'],
    seasonalDescriptors: ['exposed', 'accessible', 'weathered']
  },

  // Botanical vocabulary for tree resources
  'flux:resource:wood': {
    containerName: 'tree',
    resourceName: 'timber',
    abundanceDescriptors: {
      depleted: ['recently felled', 'showing cut stumps', 'mostly logged'],
      sparse: ['with young growth', 'sparsely wooded', 'showing saplings'],
      moderate: ['with good timber', 'moderately forested', 'decent stands'],
      abundant: ['thick with mature trees', 'heavily forested', 'prime timber'],
      overflowing: ['old growth forest', 'ancient timber stands', 'untouched woodland']
    },
    qualityDescriptors: ['ancient', 'mature', 'young', 'gnarled'],
    seasonalDescriptors: ['in leaf', 'bare-branched', 'budding', 'autumn-colored']
  },

  // Rare root resources - single discrete items with quality-based descriptions
  'flux:resource:root': {
    containerName: 'plant',
    resourceName: 'root',
    // For rare roots, "abundance" describes maturity/size, not quantity
    abundanceDescriptors: {
      depleted: ['withered away', 'dried up', 'desiccated'],
      sparse: ['barely emerged', 'tiny and underdeveloped', 'stunted'],
      moderate: ['developing', 'of modest size', 'showing promise'],
      abundant: ['well-developed', 'substantial', 'prime condition'],
      overflowing: ['fully matured', 'magnificent specimen', 'perfect specimen']
    },
    qualityDescriptors: ['ancient', 'golden', 'pristine', 'rare'],
    seasonalDescriptors: ['dormant', 'emerging', 'growing', 'mature']
  },

  'flux:resource:root:sansam': {
    containerName: 'golden sansam root',
    resourceName: 'root',
    // Sansam-specific maturity descriptors (fullness = root size/quality)
    abundanceDescriptors: {
      depleted: ['withered and worthless', 'desiccated husk'],
      sparse: ['tiny golden sansam root', 'small and immature'],
      moderate: ['growing golden sansam root', 'developing nicely'],
      abundant: ['substantial golden sansam root', 'well-formed specimen'],
      overflowing: ['fully matured golden sansam root', 'magnificent golden specimen']
    },
    qualityDescriptors: ['shimmering', 'luminous', 'precious', 'legendary'],
    seasonalDescriptors: ['dormant beneath soil', 'emerging', 'actively growing', 'at peak potency']
  }
};

### **Atomic Intersection System**

The vocabulary system uses **atomic intersection** to build the complete inheritance chain. Simple atomic values from context intersect with existing URNs to form vocabulary paths:

```typescript
function getDescriptionVocabulary(
  resourceURN: ResourceURN,
  placeURN: PlaceURN,
  context: { season: string, location: string }
): DescriptionVocabulary {

  // Extract atoms from all sources
  const resourceAtoms = resourceURN.split(':');      // ['flux', 'resource', 'fruit', 'berries']
  const placeAtoms = placeURN.split(':');           // ['flux', 'place', 'forest', 'clearing']
  const contextAtoms = [context.season, context.location]; // ['summer', 'forest']

  // Build intersected vocabulary inheritance paths
  const vocabularyPaths = [
    // Resource hierarchy
    'flux:resource',
    'flux:resource:fruit',
    'flux:resource:fruit:berries',

    // Place hierarchy (intersected)
    'flux:place:forest',
    'flux:eco:forest',           // 'forest' atom intersects with ecosystem

    // Context intersections
    'flux:time:season:summer',   // 'summer' atom constructs seasonal vocabulary
    'flux:eco:forest:summer',    // 'forest' + 'summer' atoms intersect
  ];

  let vocabulary = getDefaultVocabulary();

  // Apply vocabularies in inheritance order
  for (const path of vocabularyPaths) {
    if (TaxonomicVocabularies[path]) {
      vocabulary = mergeVocabularies(vocabulary, TaxonomicVocabularies[path]);
    }
  }

  return vocabulary;
}
```

**Example Intersection:**
- Resource: `flux:resource:fruit:berries`
- Place: `flux:place:forest:clearing:berry-patch`
- Context: `{ season: 'summer', location: 'forest' }`

**Resulting Vocabulary Paths:**
- `flux:resource` → base resource vocabulary
- `flux:resource:fruit` → fruit-specific vocabulary
- `flux:resource:fruit:berries` → berry-specific vocabulary
- `flux:place:forest` → forest place vocabulary
- `flux:eco:forest` → forest ecosystem vocabulary (from 'forest' atom)
- `flux:time:season:summer` → summer seasonal vocabulary (from 'summer' atom)
- `flux:eco:forest:summer` → forest+summer intersection vocabulary

This creates rich, contextual descriptions by combining multiple taxonomic vocabularies through atomic intersection.

function buildNarrativeLabel(
  vocabulary: DescriptionVocabulary,
  state: ResourceState
): string {
  const article = getArticle(vocabulary.containerName);

  // Build descriptor chain based on state
  const descriptors: string[] = [];

  // Add maturity/quality modifiers
  if (state.maturity !== 'mature') {
    descriptors.push(state.maturity);
  }

  if (state.quality === 'excellent' || state.quality === 'legendary') {
    const qualityDescriptor = vocabulary.qualityDescriptors[
      state.quality === 'excellent' ? 0 : 1
    ];
    if (qualityDescriptor) {
      descriptors.push(qualityDescriptor);
    }
  }

  // Base description with modifiers
  const baseDescription = descriptors.length > 0
    ? `${article} ${descriptors.join(' ')} ${vocabulary.containerName}`
    : `${article} ${vocabulary.containerName}`;

  // Add fullness-based descriptor
  const fullnessCategory = getFullnessCategory(state.fullness);
  const abundanceDescriptors = vocabulary.abundanceDescriptors[fullnessCategory];

  if (abundanceDescriptors?.length > 0) {
    // Randomly select from available descriptors for variety
    const selectedDescriptor = abundanceDescriptors[
      Math.floor(Math.random() * abundanceDescriptors.length)
    ];
    return `${baseDescription}, ${selectedDescriptor}`;
  }

  return baseDescription;
}

function getFullnessCategory(fullness: number): keyof DescriptionVocabulary['abundanceDescriptors'] {
  if (fullness <= 0.1) return 'depleted';
  if (fullness <= 0.3) return 'sparse';
  if (fullness <= 0.7) return 'moderate';
  if (fullness <= 0.9) return 'abundant';
  return 'overflowing';
}

function getArticle(word: string): string {
  return ['a', 'e', 'i', 'o', 'u'].includes(word[0].toLowerCase()) ? 'an' : 'a';
}

// Example outputs showing taxonomic vocabulary inheritance:

// flux:resource:fruit:berries (fullness: 0.85) ->
// Inherits from: flux:resource:fruit + flux:resource:fruit:berries
// Result: "a berry bush, heavy with berries"

// flux:resource:mineral:copper (fullness: 0.05) ->
// Inherits from: flux:resource:mineral + flux:resource:mineral:copper
// Result: "a copper vein, mostly worked out"

// flux:resource:wood:oak (fullness: 0.95) ->
// Inherits from: flux:resource:wood
// Result: "an ancient tree, old growth forest"

// Each taxonomic level contributes its vocabulary:
// - Base type provides general container/resource names
// - Specific type provides specialized descriptors
// - Fullness drives which abundance descriptor is selected
// - Random selection adds variety within categories
```

### **Extending Dimension Taxonomy**

The system may require additional dimension types beyond the current taxonomy. Here are suggested additions to `game/src/types/taxonomy/index.ts`:

```typescript
// Add to the taxonomy terms in TAXONOMY.terms:
dimension: {
  description: 'Measurement and quantification',
  examples: [
    'flux:dimension:mass:kilogram',
    'flux:dimension:mass:gram',
    'flux:dimension:volume:liter',
    'flux:dimension:volume:milliliter',
    'flux:dimension:length:meter',
    'flux:dimension:length:centimeter',
    'flux:dimension:count:each',
    'flux:dimension:temperature:celsius',
    'flux:dimension:percentage:percent'
  ],
},
```

**Mapping UnitOfMeasure to DimensionURN:**

```typescript
const UNIT_TO_DIMENSION_MAP: Record<UnitOfMeasure, DimensionURN> = {
  [UnitOfMeasure.MASS_KG]: 'flux:dimension:mass:kilogram',
  [UnitOfMeasure.MASS_GRAMS]: 'flux:dimension:mass:gram',
  [UnitOfMeasure.VOLUME_LITERS]: 'flux:dimension:volume:liter',
  [UnitOfMeasure.VOLUME_ML]: 'flux:dimension:volume:milliliter',
  [UnitOfMeasure.DISTANCE_METERS]: 'flux:dimension:length:meter',
  [UnitOfMeasure.DISTANCE_CENTIMETERS]: 'flux:dimension:length:centimeter',
  [UnitOfMeasure.DISTANCE_MILLIMETERS]: 'flux:dimension:length:millimeter',
  [UnitOfMeasure.DISTANCE_KILOMETERS]: 'flux:dimension:length:kilometer',
  [UnitOfMeasure.TEMPERATURE_CELSIUS]: 'flux:dimension:temperature:celsius',
  [UnitOfMeasure.VELOCITY_METERS_PER_SECOND]: 'flux:dimension:velocity:meters_per_second',
  [UnitOfMeasure.PERCENTAGE]: 'flux:dimension:percentage:percent',
  [UnitOfMeasure.EACH]: 'flux:dimension:count:each',
};

function convertUnitToDimension(uom: UnitOfMeasure): DimensionURN {
  return UNIT_TO_DIMENSION_MAP[uom];
}
```

### **Behavior Resolution Algorithm**

```typescript
function getResourceBehavior(resourceURN: ResourceURN): ResourceBehavior {
  const taxonomyPath = resourceURN.split(':');
  let behavior = {};

  // Build behavior from general to specific
  for (let i = 1; i <= taxonomyPath.length; i++) {
    const taxonomyLevel = taxonomyPath.slice(0, i).join(':');

    if (ResourceBehaviors[taxonomyLevel]) {
      behavior = mergeBehaviors(behavior, ResourceBehaviors[taxonomyLevel]);
    }
  }

  return behavior;
}

// Example: flux:resource:fruit:berries
// Inherits from:
// 1. flux:resource (base resource properties)
// 2. flux:resource:fruit (fruiting behavior and biological traits)
// 3. flux:resource:fruit:berries (species-specific if defined)
```

### **Ecosystem Behavior Modifiers**

Ecosystem types modify taxonomic behaviors to create regional adaptations:

```typescript
const EcosystemModifiers = {
  'flux:eco:desert:arid': {
    // Arid ecosystems modify fruits and seeds
    'flux:resource:fruit': {
      droughtTolerance: 2.0,       // Double drought tolerance
      waterEfficiency: 1.5,        // More efficient water use
      temperatureOptimal: [20, 45], // Shift range higher
      moistureDependency: 0.5,     // Reduce water dependency
      fruitSize: 0.8,              // Smaller but concentrated fruits
      waterContent: 0.6            // Lower water content, higher nutrients
    },

    'flux:resource:seed': {
      droughtTolerance: 2.5,       // Excellent drought tolerance
      dormancyPeriod: true,        // Extended dormancy capabilities
      germinationThreshold: 0.3,   // Lower moisture threshold for germination
      hardShell: 1.5               // Harder seed coats for protection
    },

    'flux:resource:fiber': {
      fiberStrength: 1.3,          // Stronger fibers in harsh conditions
      growthRate: 0.7,             // Slower but resilient growth
      weatherResistance: 1.4,      // Better weather tolerance
      waterEfficiency: 1.8         // Very efficient water use
    },

    'flux:resource:mineral': {
      evaporationRate: 2.0,        // Higher evaporation = more deposits
      exposureRate: 1.5,           // Wind and heat expose minerals
      concentrationBonus: 1.3      // Arid conditions concentrate minerals
    },

    'flux:resource:stone': {
      weatheringRate: 1.8,         // Rapid weathering in desert conditions
      exposureRate: 2.0,           // Wind erosion exposes stone
      sandstoneFormation: 1.5      // Desert conditions form sandstone
    }
  },

  'flux:eco:forest:temperate': {
    'flux:resource:fruit': {
      moistureDependency: 1.2,     // Higher moisture needs
      lightCompetition: true,      // Compete for light under canopy
      richSoilBonus: 1.3,         // Rich forest soil benefit
      temperatureOptimal: [10, 25], // Cooler forest temperatures
      fruitSize: 1.2,             // Larger fruits in rich soil
      biodiversity: 1.4           // More fruit varieties
    },

    'flux:resource:seed': {
      richSoilBonus: 1.4,         // Rich forest floor benefits
      lightCompetition: true,      // Compete for light patches
      germinationSuccess: 1.2,     // Higher germination rates
      dispersalRange: 1.3          // Better animal dispersal
    },

    'flux:resource:bark': {
      medicinalPotency: 1.3,       // Richer medicinal compounds
      growthRate: 1.1,            // Slightly faster bark regeneration
      diversity: 1.5              // More medicinal bark types
    },

    'flux:resource:wood': {
      growthRate: 1.4,             // Faster growth in rich forest soil
      qualityBonus: 1.2,           // Higher quality wood
      diversityBonus: true,        // More wood types available
      densityBonus: 1.1           // Denser, stronger wood
    }
  },

  'flux:eco:mountain:arid': {
    'flux:resource:mineral': {
      oreConcentration: 2.0,       // Mountain geology concentrates ores
      weatheringRate: 1.5,         // Extreme weather exposes deposits
      rareMetalBonus: 1.8,         // Geological processes create rare metals
      exposureVariability: 2.0     // High variability in exposure
    },

    'flux:resource:ingredient:seed': {
      coldTolerance: 1.5,          // Mountain-adapted seed tolerance
      altitudeAdaptation: true,    // High-altitude adaptations
      seasonalExtreme: 1.3         // Handle extreme seasonal variation
    }
  }
};
```

## Taxonomic Weather Response Functions

### **Biological Weather Responses**

```typescript
const WeatherResponseFunctions = {
  // All ingredients follow photosynthetic patterns
  'flux:resource:ingredient': (weather: WeatherConditions, behavior: ResourceBehavior) => {
    const tempResponse = biologicalTemperatureResponse(
      weather.temperature,
      behavior.temperatureOptimal[0],
      behavior.temperatureOptimal[1]
    );
    const lightResponse = photosynthesisCurve(weather.ppfd, behavior.lightDependency);
    const moistureResponse = moistureDependency(weather.humidity, behavior.moistureDependency);

    return tempResponse * lightResponse * moistureResponse;
  },

  // Fruits have specialized reproductive responses
  'flux:resource:ingredient:fruit': (weather: WeatherConditions, behavior: ResourceBehavior) => {
    const baseResponse = WeatherResponseFunctions['flux:resource:ingredient'](weather, behavior);
    const pollinationWeather = calculatePollinationConditions(weather);
    const fruitingMoisture = weather.humidity > 50 ? 1.2 : 0.8; // Fruits need moisture

    return baseResponse * pollinationWeather * fruitingMoisture;
  },

  // Seeds have dormancy and germination responses
  'flux:resource:ingredient:seed': (weather: WeatherConditions, behavior: ResourceBehavior) => {
    const baseResponse = WeatherResponseFunctions['flux:resource:ingredient'](weather, behavior);
    const dormancyModifier = calculateDormancyResponse(weather, Date.now());
    const germinationTrigger = calculateGerminationTrigger(weather);

    return baseResponse * dormancyModifier * germinationTrigger;
  },

  // Fibers have continuous growth patterns
  'flux:resource:material:fiber': (weather: WeatherConditions, behavior: ResourceBehavior) => {
    const tempResponse = biologicalTemperatureResponse(
      weather.temperature,
      behavior.temperatureOptimal[0],
      behavior.temperatureOptimal[1]
    );
    const lightResponse = photosynthesisCurve(weather.ppfd, behavior.lightDependency);
    const waterResponse = fiberGrowthWater(weather.precipitation, behavior.moistureDependency);

    return tempResponse * lightResponse * waterResponse;
  },

  // Minerals follow geological processes
  'flux:resource:mineral': (weather: WeatherConditions, behavior: ResourceBehavior) => {
    const weatheringRate = calculateWeathering(weather.precipitation, weather.temperature);
    const evaporationRate = calculateEvaporation(weather.temperature, weather.humidity);
    const exposureRate = calculateExposure(weather.pressure, weather.precipitation);

    // Very small weather influence on geological processes
    return 0.1 + (weatheringRate * 0.05) + (evaporationRate * 0.03) + (exposureRate * 0.02);
  }
};
```

### **Specialized Response Calculations**

```typescript
function biologicalTemperatureResponse(temp: number, minOptimal: number, maxOptimal: number): number {
  if (temp < minOptimal - 10 || temp > maxOptimal + 15) return 0; // Death zones
  if (temp >= minOptimal && temp <= maxOptimal) return 1.0; // Optimal zone

  // Gradual falloff outside optimal range
  if (temp < minOptimal) {
    return Math.max(0, (temp - (minOptimal - 10)) / 10);
  } else {
    return Math.max(0, ((maxOptimal + 15) - temp) / 15);
  }
}

function photosynthesisCurve(ppfd: number, lightDependency: number): number {
  const maxPPFD = 2000; // Saturation point
  const lightResponse = Math.min(ppfd / maxPPFD, 1.0);
  return 1 - lightDependency + (lightDependency * lightResponse);
}

function moistureDependency(humidity: number, dependency: number): number {
  const optimalHumidity = 60;
  const humidityResponse = Math.max(0, 1 - Math.abs(humidity - optimalHumidity) / 40);
  return 1 - dependency + (dependency * humidityResponse);
}

function calculateWeathering(precipitation: number, temperature: number): number {
  const freezeThaw = Math.abs(temperature) < 5 ? 1.5 : 1.0; // Freeze-thaw cycles
  const waterErosion = Math.min(precipitation / 5.0, 1.0);   // Water erosion
  return freezeThaw * waterErosion;
}
```

## Growth Models by Taxonomic Category

### **Biological Growth** (Ingredients & Materials)

```typescript
function biologicalGrowthModel(
  currentAmount: number,
  behavior: ResourceBehavior,
  weatherMultiplier: number,
  seasonalMultiplier: number
): number {
  const carryingCapacity = behavior.baseCarryingCapacity;
  const growthRate = behavior.baseGrowthRate;

  // Logistic growth with environmental influences
  const growthPotential = currentAmount * growthRate * weatherMultiplier * seasonalMultiplier;
  const capacityLimiting = (carryingCapacity - currentAmount) / carryingCapacity;

  return Math.max(0, currentAmount + (growthPotential * capacityLimiting));
}
```

### **Geological Accumulation** (Minerals)

```typescript
function geologicalAccumulationModel(
  currentAmount: number,
  behavior: ResourceBehavior,
  weatherCatalyst: number
): number {
  const baseRate = behavior.baseGrowthRate; // Very slow for minerals
  const maxCapacity = behavior.baseCarryingCapacity;

  // Minimal base rate with weather amplification
  const accumulationRate = baseRate * (1 + weatherCatalyst);
  return Math.min(currentAmount + accumulationRate, maxCapacity);
}
```

### **Seasonal Response Patterns**

```typescript
function calculateSeasonalMultiplier(
  resourceURN: ResourceURN,
  behavior: ResourceBehavior,
  timestamp: number
): number {
  if (!behavior.seasonalVariation) return 1.0;

  const dayOfYear = new Date(timestamp).getUTCDate();
  const seasonalPhase = (dayOfYear / 365) * 2 * Math.PI;

  // Determine seasonal pattern from taxonomic level
  if (resourceURN.includes(':fruit:')) {
    return 0.5 + 0.5 * Math.sin(seasonalPhase + Math.PI/2); // Summer peak
  } else if (resourceURN.includes(':seed:')) {
    return 0.3 + 0.7 * Math.sin(seasonalPhase + Math.PI); // Autumn peak
  } else if (resourceURN.includes(':fiber:')) {
    return 0.6 + 0.4 * Math.sin(seasonalPhase); // Spring peak
  }

  return 1.0; // No seasonal variation
}
```

## Resource State Management

### **Enhanced Resource State with Taxonomy**

```typescript
type ResourceState = {
  id: string;
  urn: ResourceURN;              // Full taxonomic URN
  location: PlaceURN;

  // Current availability
  currentAmount: number;
  maxCapacity: number;

  // Computed behavior from taxonomy
  behavior: ResourceBehavior;     // Resolved from taxonomic hierarchy
  ecosystemModifiers: EcosystemModifiers; // Applied ecosystem modifications

  // Dynamic state
  lastUpdateTimestamp: number;
  accumulatedGrowth: number;      // Sub-unit growth tracking
  seasonalPhase: number;
  dormancyPeriod?: { start: number, end: number };

  // Environmental response tracking
  weatherHistory: WeatherConditions[]; // Recent weather for trend analysis
  growthTrend: number;           // Recent growth rate trend
}

type ResourceBehavior = {
  // Inherited from taxonomic hierarchy
  baseGrowthRate: number;
  temperatureOptimal: [number, number];
  lightDependency: number;
  moistureDependency: number;
  weatherResponsive: boolean;
  seasonalVariation: boolean;

  // Modifiers from ecosystem
  droughtTolerance?: number;
  frostTolerance?: number;
  competitiveRanking?: number;

  // Growth characteristics
  continuousGrowth?: boolean;
  reproductiveCycle?: boolean;
  dormancyPeriod?: boolean;
  geologicalProcess?: boolean;
}
```

### **Taxonomic Resource Factory**

```typescript
class TaxonomicResourceFactory {
  static createResource(
    urn: ResourceURN,
    location: PlaceURN,
    ecosystem: EcosystemURN
  ): ResourceState {
    // Resolve behavior from taxonomic hierarchy
    const baseBehavior = getResourceBehavior(urn);
    const ecosystemModifiers = getEcosystemModifiers(ecosystem, urn);
    const finalBehavior = applyEcosystemModifiers(baseBehavior, ecosystemModifiers);

    return {
      id: generateUniqueId(),
      urn,
      location,
      currentAmount: 0,
      maxCapacity: finalBehavior.baseCarryingCapacity,
      behavior: finalBehavior,
      ecosystemModifiers,
      lastUpdateTimestamp: Date.now(),
      accumulatedGrowth: 0,
      seasonalPhase: 0,
      weatherHistory: [],
      growthTrend: 1.0
    };
  }
}
```

## Integration with Weather System

### **Taxonomic Weather Event Processing**

```typescript
class ResourceSimulationService implements SimulationServiceInterface {

  async processBatch(batchId: string, events: WorldEvent[]): Promise<void> {
    const weatherEvents = events.filter(e => e.type === 'WEATHER_DID_CHANGE');

    for (const weatherEvent of weatherEvents) {
      await this.updateResourcesForWeatherChange(
        weatherEvent.placeId,
        weatherEvent.to
      );
    }
  }

  private async updateResourcesForWeatherChange(
    placeId: PlaceURN,
    newWeather: WeatherConditions
  ): Promise<void> {
    const locationResources = this.getLocationResources(placeId);

    for (const resource of locationResources) {
      // Get taxonomic weather response function
      const responseFunction = this.getTaxonomicWeatherResponse(resource.urn);
      const weatherMultiplier = responseFunction(newWeather, resource.behavior);

      // Calculate growth using taxonomic models
      const newAmount = this.calculateTaxonomicGrowth(
        resource,
        weatherMultiplier,
        Date.now()
      );

      // Queue command if significant change
      if (this.isSignificantChange(resource.currentAmount, newAmount)) {
        this.queueResourceUpdateCommand(placeId, resource.urn, newAmount);
      }

      resource.currentAmount = newAmount;
      resource.lastUpdateTimestamp = Date.now();
      resource.weatherHistory.push(newWeather);
    }
  }

  private getTaxonomicWeatherResponse(urn: ResourceURN): WeatherResponseFunction {
    // Find the most specific response function for this taxonomic level
    const taxonomyLevels = urn.split(':');

    for (let i = taxonomyLevels.length; i >= 1; i--) {
      const taxonomyLevel = taxonomyLevels.slice(0, i).join(':');
      if (WeatherResponseFunctions[taxonomyLevel]) {
        return WeatherResponseFunctions[taxonomyLevel];
      }
    }

    // Fallback to base resource response
    return WeatherResponseFunctions['flux:resource'];
  }
}
```

## Anti-Equilibrium Resource Dynamics

### **Taxonomic Competition Models**

```typescript
function applyTaxonomicCompetition(
  locationResources: ResourceState[],
  ecosystem: EcosystemURN
): ResourceState[] {
  const carryingCapacity = getEcosystemCarryingCapacity(ecosystem);
  const totalBiomass = calculateTotalBiomass(locationResources);

  if (totalBiomass > carryingCapacity) {
    const pressureIntensity = (totalBiomass - carryingCapacity) / carryingCapacity;

    for (const resource of locationResources) {
      // Competition based on taxonomic competitive ranking
      const competitiveAdvantage = getTaxonomicCompetitiveRanking(resource.urn);
      const pressureResistance = Math.pow(1 - pressureIntensity, 1 / competitiveAdvantage);

      resource.currentAmount *= pressureResistance;
    }
  }

  return locationResources;
}

function getTaxonomicCompetitiveRanking(urn: ResourceURN): number {
  // Fast-growing resources outcompete slow-growing ones
  if (urn.includes(':fiber:')) return 2.0;  // Fast growing fibers
  if (urn.includes(':fruit:')) return 1.5;  // Seasonal fruits
  if (urn.includes(':seed:')) return 1.2;   // Moderate seed production
  if (urn.includes(':wood:')) return 0.8;   // Slow growing trees
  if (urn.includes(':mineral:')) return 0.1; // No biological competition

  return 1.0; // Default ranking
}
```

## Future Extensions

### **Advanced Taxonomic Behaviors**

```typescript
// Symbiotic relationships between taxonomic groups
const TaxonomicSymbiosis = {
  'flux:resource:material:wood': {
    enhances: ['flux:resource:ingredient:seed'], // Trees help seed production
    enhancementFactor: 1.3
  },
  'flux:resource:ingredient:fruit': {
    requires: ['flux:resource:material:wood'],   // Fruits need trees
    requirementFactor: 0.5                      // 50% reduction without trees
  }
};

// Succession patterns based on taxonomy
const TaxonomicSuccession = {
  'flux:resource:ingredient:seed': {
    creates: 'flux:resource:material:wood',     // Seeds grow into trees
    maturationTime: 10000                      // Time to mature
  },
  'flux:resource:material:wood': {
    creates: 'flux:resource:ingredient:fruit',  // Mature trees produce fruit
    maturationTime: 5000
  }
};
```

## Conclusion

The **Taxonomic Resource Generation System** creates biologically authentic behaviors through hierarchical inheritance while maintaining system elegance and maintainability. Rather than programming hundreds of individual species, we define behaviors at taxonomic levels that naturally compose into realistic resource patterns.

**Key Benefits**:

1. **Biological Authenticity**: Related resources share behaviors just like real biology
2. **System Elegance**: ~10 taxonomic behaviors generate infinite species variety
3. **Maintainability**: Changes to taxonomic levels affect all related resources
4. **Extensibility**: New resources inherit appropriate behaviors automatically
5. **Ecosystem Integration**: Modifiers create regional adaptations naturally

**Resources become the ecological translators** that convert atmospheric physics into biological opportunity, creating the foundation for authentic creature decision-making at ecosystem scale. The taxonomic approach ensures that this translation follows the same inheritance patterns that govern real biological systems.

The result is a **living taxonomy** where each resource automatically exhibits the appropriate biological or geological behaviors based on its classification, creating authentic ecosystem dynamics that drive meaningful gameplay at the scale of entire digital biospheres.
