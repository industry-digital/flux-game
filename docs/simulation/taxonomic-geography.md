# World Generation and Ecological Profiles

## Overview

This document describes the approach for generating a coherent world graph where Places are assigned appropriate ecological profiles based on their geographic context. The world generator creates places with sensible `ecology` values that reflect their biome and climate characteristics, while the weather service simply generates weather patterns that satisfy these ecological constraints.

## Architecture Philosophy

### Separation of Concerns

The system cleanly separates world generation from weather simulation:

- **World Generator**: Creates places with appropriate ecological profiles based on geographic context
- **Weather Service**: Generates weather patterns that satisfy ecological constraints (agnostic to how those constraints were determined)
- **No Complex Coordination**: Weather service doesn't need to understand taxonomic geography - it just respects the `ecology` bounds

### Ecological Constraints as Interface

The `EcologicalProfile` serves as the interface between world generation and weather simulation:

```typescript
interface EcologicalProfile {
  ecosystem: EcosystemURN;  // flux:ecosystem:forest:temperate
  temperature: [number, number];        // Valid temperature range [min, max]
  pressure: [number, number];           // Valid pressure range [min, max]
  humidity: [number, number];           // Valid humidity range [min, max]
}
```

## World Generation Strategy

### Simple Geographic Assignment

The world generator assigns ecological profiles based on straightforward geographic principles:

```typescript
function generateEcologicalProfile(place: Place): EcologicalProfile {
  const biome = determineBiome(place.position, place.urn);
  const climate = determineClimate(place.position, place.urn);
  const elevation = determineElevation(place.position, place.urn);

  return createEcologicalProfile(biome, climate, elevation);
}

function createEcologicalProfile(biome: string, climate: string, elevation: string): EcologicalProfile {
  // Simple lookup table based on biome/climate/elevation
  const profiles = {
    'temperate_forest_low': {
      ecosystem: 'flux:ecosystem:temperate:forest',
      temperature: [5.0, 35.0],
      pressure: [1000.0, 1030.0],
      humidity: [40.0, 90.0]
    },
    'arctic_tundra_high': {
      ecosystem: 'flux:ecosystem:arctic:tundra',
      temperature: [-30.0, 10.0],
      pressure: [950.0, 1020.0],
      humidity: [30.0, 80.0]
    },
    'tropical_rainforest_low': {
      ecosystem: 'flux:ecosystem:tropical:rainforest',
      temperature: [20.0, 40.0],
      pressure: [1005.0, 1020.0],
      humidity: [60.0, 95.0]
    },
    'desert_arid_medium': {
      ecosystem: 'flux:ecosystem:arid:desert',
      temperature: [10.0, 50.0],
      pressure: [1010.0, 1025.0],
      humidity: [10.0, 40.0]
    }
  };

  const key = `${climate}_${biome}_${elevation}`;
  return profiles[key] || defaultProfile;
}
```

### Smooth Gradient Assignment

The world generator must ensure that neighboring places have compatible ecological profiles that create smooth gradients in fundamental atmospheric properties. This prevents jarring weather transitions while maintaining ecological diversity.

```typescript
function assignEcologicalProfilesWithSmoothGradients(places: Place[]): Place[] {
  // First pass: assign base profiles
  const placesWithProfiles = places.map(place => ({
    ...place,
    ecology: generateEcologicalProfile(place)
  }));

  // Second pass: smooth gradients between neighbors
  return smoothEcologicalGradients(placesWithProfiles);
}

function smoothEcologicalGradients(places: Place[]): Place[] {
  const maxIterations = 10;
  let currentPlaces = [...places];

  for (let i = 0; i < maxIterations; i++) {
    let hasChanges = false;

    currentPlaces = currentPlaces.map(place => {
      const neighbors = getNeighborPlaces(place, currentPlaces);
      const smoothedProfile = smoothProfileWithNeighbors(place.ecology, neighbors);

      if (profilesSignificantlyDifferent(place.ecology, smoothedProfile)) {
        hasChanges = true;
        return { ...place, ecology: smoothedProfile };
      }

      return place;
    });

    if (!hasChanges) break; // Converged
  }

  return currentPlaces;
}
```

### Gradient Smoothing Rules

The system enforces maximum differences between neighboring ecological profiles:

```typescript
const MAX_GRADIENT_DIFFERENCES = {
  temperature: 15.0,  // Max 15°C difference in temperature ranges
  pressure: 20.0,     // Max 20 hPa difference in pressure ranges
  humidity: 25.0      // Max 25% difference in humidity ranges
};

function smoothProfileWithNeighbors(profile: EcologicalProfile, neighbors: Place[]): EcologicalProfile {
  if (neighbors.length === 0) return profile;

  // Calculate average neighbor ranges
  const avgNeighborProfile = calculateAverageProfile(neighbors.map(n => n.ecology));

  // Blend current profile with neighbor average to reduce gradients
  return blendProfiles(profile, avgNeighborProfile, 0.3); // 30% influence from neighbors
}

function blendProfiles(base: EcologicalProfile, neighbor: EcologicalProfile, influence: number): EcologicalProfile {
  return {
    ecosystem: base.ecosystem, // Keep original ecosystem type
    temperature: blendRange(base.temperature, neighbor.temperature, influence),
    pressure: blendRange(base.pressure, neighbor.pressure, influence),
    humidity: blendRange(base.humidity, neighbor.humidity, influence)
  };
}

function blendRange(baseRange: [number, number], neighborRange: [number, number], influence: number): [number, number] {
  const blendedMin = baseRange[0] + (neighborRange[0] - baseRange[0]) * influence;
  const blendedMax = baseRange[1] + (neighborRange[1] - baseRange[1]) * influence;

  return [blendedMin, blendedMax];
}
```

### Gradient Validation

Ensure ecological profiles create acceptable transitions:

```typescript
function validateEcologicalGradients(places: Place[]): boolean {
  for (const place of places) {
    const neighbors = getNeighborPlaces(place, places);

    for (const neighbor of neighbors) {
      if (!isCompatibleGradient(place.ecology, neighbor.ecology)) {
        console.warn(`Excessive gradient between ${place.urn} and ${neighbor.urn}`);
        return false;
      }
    }
  }

  return true;
}

function isCompatibleGradient(profileA: EcologicalProfile, profileB: EcologicalProfile): boolean {
  // Check temperature gradient
  const tempDiff = Math.max(
    Math.abs(profileA.temperature[0] - profileB.temperature[0]),
    Math.abs(profileA.temperature[1] - profileB.temperature[1])
  );

  // Check pressure gradient
  const pressureDiff = Math.max(
    Math.abs(profileA.pressure[0] - profileB.pressure[0]),
    Math.abs(profileA.pressure[1] - profileB.pressure[1])
  );

  // Check humidity gradient
  const humidityDiff = Math.max(
    Math.abs(profileA.humidity[0] - profileB.humidity[0]),
    Math.abs(profileA.humidity[1] - profileB.humidity[1])
  );

  return tempDiff <= MAX_GRADIENT_DIFFERENCES.temperature &&
         pressureDiff <= MAX_GRADIENT_DIFFERENCES.pressure &&
         humidityDiff <= MAX_GRADIENT_DIFFERENCES.humidity;
}
```

### URN-Based Geographic Context

Use URN structure to infer geographic context:

```typescript
function determineBiome(position: Position, urn: string): string {
  // Extract biome hints from URN
  const parts = urn.split(':');
  const regionName = parts[2]; // "thornwood", "frostpeak", "sunlands"

  // Simple pattern matching
  if (regionName.includes('thorn') || regionName.includes('wood')) return 'forest';
  if (regionName.includes('frost') || regionName.includes('ice')) return 'tundra';
  if (regionName.includes('sun') || regionName.includes('sand')) return 'desert';
  if (regionName.includes('marsh') || regionName.includes('swamp')) return 'wetland';

  return 'temperate'; // Default
}

function determineClimate(position: Position, urn: string): string {
  // Infer climate from region name and position
  const regionName = urn.split(':')[2];

  if (regionName.includes('frost') || regionName.includes('ice') || regionName.includes('snow')) {
    return 'arctic';
  }
  if (regionName.includes('sun') || regionName.includes('flame') || regionName.includes('scorch')) {
    return 'tropical';
  }
  if (regionName.includes('storm') || regionName.includes('wind')) {
    return 'temperate';
  }

  return 'temperate'; // Default
}
```

## Place Generation Workflow

### Step 1: Generate Place Structure

Create the basic place graph based on desired world structure:

```typescript
function generateWorldGraph(): Place[] {
  const places = [];

  // Generate regions
  const regions = generateRegions(8); // 8 world regions

  // Generate areas within regions
  for (const region of regions) {
    const areas = generateAreas(region, 3, 8); // 3-8 areas per region

    // Generate locations within areas
    for (const area of areas) {
      const locations = generateLocations(area, 4, 12); // 4-12 locations per area
      places.push(...locations);
    }

    places.push(...areas);
  }

  places.push(...regions);

  return places;
}
```

### Step 2: Assign Ecological Profiles

After place structure is created, assign appropriate ecological profiles:

```typescript
function assignEcologicalProfiles(places: Place[]): Place[] {
  return places.map(place => ({
    ...place,
    ecology: generateEcologicalProfile(place)
  }));
}
```

### Step 3: Generate Connectivity

Connect places based on geographic relationships:

```typescript
function generateConnectivity(places: Place[]): Place[] {
  // Connect based on URN hierarchy and geographic proximity
  return places.map(place => ({
    ...place,
    exits: generateExits(place, places)
  }));
}
```

## Ecological Profile Templates

### Common Ecosystem Templates

```typescript
const ecosystemTemplates = {
  'flux:ecosystem:temperate:forest': {
    temperature: [5.0, 35.0],
    pressure: [1000.0, 1030.0],
    humidity: [40.0, 90.0]
  },
  'flux:ecosystem:temperate:grassland': {
    temperature: [0.0, 40.0],
    pressure: [1005.0, 1025.0],
    humidity: [30.0, 80.0]
  },
  'flux:ecosystem:arctic:tundra': {
    temperature: [-30.0, 10.0],
    pressure: [950.0, 1020.0],
    humidity: [30.0, 80.0]
  },
  'flux:ecosystem:tropical:rainforest': {
    temperature: [20.0, 40.0],
    pressure: [1005.0, 1020.0],
    humidity: [60.0, 95.0]
  },
  'flux:ecosystem:arid:desert': {
    temperature: [10.0, 50.0],
    pressure: [1010.0, 1025.0],
    humidity: [10.0, 40.0]
  },
  'flux:ecosystem:coastal:wetland': {
    temperature: [5.0, 30.0],
    pressure: [1000.0, 1020.0],
    humidity: [70.0, 95.0]
  }
};
```

### Elevation Modifiers

```typescript
function applyElevationModifiers(baseProfile: EcologicalProfile, elevation: string): EcologicalProfile {
  const modifiers = {
    'high': {
      temperatureOffset: [-10.0, -5.0],    // Cooler at altitude
      pressureOffset: [-50.0, -20.0],      // Lower pressure at altitude
      humidityOffset: [-10.0, 10.0]        // Variable humidity
    },
    'low': {
      temperatureOffset: [2.0, 5.0],       // Warmer at sea level
      pressureOffset: [10.0, 20.0],        // Higher pressure
      humidityOffset: [0.0, 15.0]          // Often more humid
    },
    'medium': {
      temperatureOffset: [0.0, 0.0],       // Baseline
      pressureOffset: [0.0, 0.0],          // Baseline
      humidityOffset: [0.0, 0.0]           // Baseline
    }
  };

  const modifier = modifiers[elevation] || modifiers['medium'];

  return {
    ...baseProfile,
    temperature: [
      baseProfile.temperature[0] + modifier.temperatureOffset[0],
      baseProfile.temperature[1] + modifier.temperatureOffset[1]
    ],
    pressure: [
      baseProfile.pressure[0] + modifier.pressureOffset[0],
      baseProfile.pressure[1] + modifier.pressureOffset[1]
    ],
    humidity: [
      baseProfile.humidity[0] + modifier.humidityOffset[0],
      baseProfile.humidity[1] + modifier.humidityOffset[1]
    ]
  };
}
```

## Weather Service Integration

### Weather Constraint Satisfaction

The weather service simply generates weather within the ecological bounds:

```typescript
function generateWeatherForPlace(place: Place, neighbors: Place[], timestamp: number): Weather {
  const baseWeather = generateBaseWeather(place.ecology, timestamp);
  const neighborInfluence = calculateNeighborInfluence(neighbors);

  // Blend base weather with neighbor influence
  const blendedWeather = blendWeatherWithNeighbors(baseWeather, neighborInfluence);

  // Ensure final weather respects ecological bounds
  return constrainWeatherToEcology(blendedWeather, place.ecology);
}

function constrainWeatherToEcology(weather: Weather, ecology: EcologicalProfile): Weather {
  return {
    ...weather,
    temperature: clamp(weather.temperature, ecology.temperature[0], ecology.temperature[1]),
    pressure: clamp(weather.pressure, ecology.pressure[0], ecology.pressure[1]),
    humidity: clamp(weather.humidity, ecology.humidity[0], ecology.humidity[1])
  };
}
```

### No Taxonomic Awareness Required

The weather service doesn't need to understand:
- How ecological profiles were determined
- Geographic relationships between places
- Taxonomic continuity rules
- Biome classifications

It simply:
1. Generates weather within ecological bounds
2. Applies neighbor influence for spatial coherence
3. Evolves weather using atmospheric physics

## Benefits of This Approach

### **Clean Separation of Concerns**
- World generation handles geography and ecology assignment
- Weather service focuses purely on atmospheric physics
- No complex coordination between systems

### **Simple Implementation**
- Straightforward lookup tables for ecological profiles
- Easy to add new biomes/climates
- No complex taxonomic continuity algorithms

### **Maintainable Architecture**
- Each system has clear responsibilities
- Weather service can be developed independently
- Easy to test and debug

### **Flexible Extensions**
- Can add new ecosystem types without changing weather service
- Easy to modify ecological bounds for balancing
- Simple to create special locations with unique profiles

## Example World Generation

```typescript
// Generate a simple world
const world = generateWorld({
  regions: [
    { urn: 'flux:place:thornwood', biome: 'forest', climate: 'temperate' },
    { urn: 'flux:place:frostpeak', biome: 'tundra', climate: 'arctic' },
    { urn: 'flux:place:sunlands', biome: 'desert', climate: 'arid' },
    { urn: 'flux:place:mistmoors', biome: 'wetland', climate: 'temperate' }
  ]
});

// Each place gets appropriate ecology:
// thornwood → temperate forest profile
// frostpeak → arctic tundra profile
// sunlands → arid desert profile
// mistmoors → temperate wetland profile

// Weather service generates weather within these bounds
// No need to understand the geographic relationships
```

## Conclusion

This simplified approach achieves all the goals of coherent world generation while maintaining clean architectural boundaries. The world generator creates places with sensible ecological profiles, and the weather service generates appropriate weather without needing to understand the complex geographic relationships that determined those profiles.

The result is a maintainable, extensible system where each component has clear responsibilities and can be developed independently.
