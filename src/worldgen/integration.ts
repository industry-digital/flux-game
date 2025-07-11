/**
 * World generation integration layer
 * Maps pure geometric Lichtenberg figures to world-specific concepts
 */

import { Place } from '~/types/entity/place';
import { EntityType } from '~/types/entity/entity';
import {
  LichtenbergVertex,
  LichtenbergConnection,
  LichtenbergFigure,
  LichtenbergConfig,
  generateLichtenbergFigure
} from '../lib/fractal/lichtenberg';
import {
  WorldGenerationConfig,
  WorldGenerationResult,
  EcosystemName,
  ECOSYSTEM_PROFILES,
  WorldVertex
} from './types';
import { Direction, PlaceURN } from '~/types';

/**
 * Simple seeded random number generator using Linear Congruential Generator
 * This ensures deterministic behavior across test runs
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Main world generation function
 * Generates world using multiple Lichtenberg figures (one per ecosystem), then connects them
 */
export function generateWorld(config: WorldGenerationConfig): WorldGenerationResult {
  // Create seeded random generator for deterministic behavior
  const seededRandom = new SeededRandom(config.seed || 42);

  // 1. Generate Lichtenberg figures for each ecosystem band
  const ecosystemFigures = generateEcosystemFigures(config);

  // 2. Connect adjacent ecosystem figures
  const connectedFigure = connectEcosystemFigures(ecosystemFigures, config);

  // 3. Map vertices to ecosystems based on their origin band
  const worldVertices = mapVerticesToEcosystems(connectedFigure.vertices, connectedFigure.config);

  // 4. Convert to full Place objects
  const places = createPlacesFromVertices(worldVertices);

  // 5. Populate exits from connections
  populatePlaceExits(places, connectedFigure.connections);

  // 6. Adjust connectivity based on ecosystem characteristics
  adjustEcosystemConnectivity(places, seededRandom);

  // 7. Ensure global connectivity after all adjustments
  ensureGlobalConnectivity(places, seededRandom);

  // 8. Calculate connection statistics
  const connections = calculateConnectionStats(places);

  return {
    places,
    vertices: worldVertices, // Include original vertex coordinates for visualization
    connections,
    config
  };
}

/**
 * Generate separate Lichtenberg figures for each ecosystem band
 */
function generateEcosystemFigures(config: WorldGenerationConfig): EcosystemFigure[] {
  const worldWidth = 1000;
  const worldHeight = worldWidth / config.worldAspectRatio;
  const bandWidth = worldWidth / 5; // 5 ecosystem bands

  const ecosystemBands = [
    EcosystemName.STEPPE_ARID,
    EcosystemName.GRASSLAND_TEMPERATE,
    EcosystemName.FOREST_TEMPERATE,
    EcosystemName.MOUNTAIN_ARID,
    EcosystemName.JUNGLE_TROPICAL
  ];

  let globalVertexCounter = 0;

  return ecosystemBands.map((ecosystem, index) => {
    const startX = index * bandWidth;
    const endX = (index + 1) * bandWidth;

    // Each ecosystem gets roughly equal share of total places
    const targetPlaces = Math.floor(config.minPlaces / 5);
    const maxPlaces = Math.floor((config.maxPlaces || config.minPlaces * 2) / 5);

        const lichtenbergConfig: LichtenbergConfig = {
      startX: 0, // Start at beginning of band
      startY: worldHeight / 2,
      width: bandWidth,
      height: worldHeight,
      branchingFactor: 0.8, // Higher branching for more places
      branchingAngle: Math.PI / 2,
      stepSize: 60, // Smaller steps for more density
      maxDepth: 20, // Higher depth for more coverage
      eastwardBias: 0.7,
      verticalBias: 0.0,
      seed: 42 + index, // Different seed per ecosystem
      startingVertexId: globalVertexCounter, // Ensure unique IDs across ecosystems

      minVertices: Math.max(3, targetPlaces), // Ensure minimum places per ecosystem
      maxVertices: Math.max(maxPlaces, 15), // Ensure reasonable maximum

      sparking: {
        enabled: true,
        probability: 0.6,
        maxSparkDepth: 3,
        sparkingConditions: {
          boundaryPoints: [],
          randomSparking: true
        },
        fishSpineBias: 0.7
      }
    };

    const figure = generateLichtenbergFigure(lichtenbergConfig);

    // Update global counter for next ecosystem
    globalVertexCounter += figure.vertices.length;

    // Offset vertices to absolute world coordinates
    const offsetVertices = figure.vertices.map((vertex: LichtenbergVertex) => ({
      ...vertex,
      x: vertex.x + startX,
      ecosystem
    }));

    return {
      ecosystem,
      figure: {
        vertices: offsetVertices,
        connections: figure.connections
      },
      bandStart: startX,
      bandEnd: endX,
      config: lichtenbergConfig
    };
  });
}

/**
 * Connect adjacent ecosystem figures by linking easternmost vertices to westernmost vertices
 */
function connectEcosystemFigures(
  ecosystemFigures: EcosystemFigure[],
  config: WorldGenerationConfig
): { vertices: LichtenbergVertex[]; connections: LichtenbergConnection[]; config: LichtenbergConfig } {
  let allVertices: LichtenbergVertex[] = [];
  let allConnections: LichtenbergConnection[] = [];

  // Collect all vertices and connections from individual figures
  // IDs are already unique thanks to startingVertexId parameter
  ecosystemFigures.forEach(ecosystemFigure => {
    allVertices.push(...ecosystemFigure.figure.vertices);
    allConnections.push(...ecosystemFigure.figure.connections);
  });

  // Connect adjacent ecosystems
  for (let i = 0; i < ecosystemFigures.length - 1; i++) {
    const westEcosystem = ecosystemFigures[i];
    const eastEcosystem = ecosystemFigures[i + 1];

    // Find easternmost vertex in west ecosystem
    const eastmostWest = westEcosystem.figure.vertices.reduce((eastmost: any, vertex: any) =>
      vertex.x > eastmost.x ? vertex : eastmost
    );

    // Find westernmost vertex in east ecosystem
    const westmostEast = eastEcosystem.figure.vertices.reduce((westmost: any, vertex: any) =>
      vertex.x < westmost.x ? vertex : westmost
    );

    // Create connection between ecosystems
    const connectionId = `connection_${eastmostWest.id}_${westmostEast.id}`;
    const distance = Math.sqrt(
      Math.pow(westmostEast.x - eastmostWest.x, 2) +
      Math.pow(westmostEast.y - eastmostWest.y, 2)
    );

    allConnections.push({
      from: eastmostWest.id,
      to: westmostEast.id,
      length: distance,
      artificial: true, // Mark as artificial inter-ecosystem connection
      ecosystemTransition: {
        from: westEcosystem.ecosystem,
        to: eastEcosystem.ecosystem
      }
    });
  }

  // Create a combined config for the result
  const combinedConfig: LichtenbergConfig = {
    startX: 0,
    startY: 500,
    width: 1000,
    height: 1000 / config.worldAspectRatio,
    branchingFactor: 0.7,
    branchingAngle: Math.PI / 3,
    stepSize: 80,
    maxDepth: 15,
    eastwardBias: 0.8,
    seed: 42,
    minVertices: config.minPlaces,
    maxVertices: config.maxPlaces
  };

  return {
    vertices: allVertices,
    connections: allConnections,
    config: combinedConfig
  };
}

// Type for ecosystem-specific figures
type EcosystemFigure = {
  ecosystem: EcosystemName;
  figure: LichtenbergFigure;
  bandStart: number;
  bandEnd: number;
  config: LichtenbergConfig;
};

/**
 * Convert WorldGenerationConfig to pure geometric LichtenbergConfig
 */
function createGeometricConfig(config: WorldGenerationConfig): LichtenbergConfig {
  const worldWidth = 1000; // Arbitrary units - will be scaled to Places
  const worldHeight = worldWidth / config.worldAspectRatio;

    return {
    startX: 0, // Start at the west edge
    startY: worldHeight / 2,
    width: worldWidth,
    height: worldHeight,
    branchingFactor: 0.98, // Maximum branching to ensure coverage
    branchingAngle: Math.PI, // Very wide angles for maximum spread
    stepSize: 200, // Very large steps to ensure we cross ecosystem boundaries
    maxDepth: 40, // Very high depth to ensure we reach the eastern edge
    eastwardBias: 0.95, // Maximum eastward bias to ensure crossing all bands
    verticalBias: 0.0,
    seed: 42,

    // Apply vertex constraints from config
    minVertices: config.lichtenberg.minVertices,
    maxVertices: config.maxPlaces,

    // Enable sparking with ecosystem boundaries - force sparking at boundaries
    sparking: {
      enabled: true,
      probability: 0.9, // Maximum sparking probability
      maxSparkDepth: 6, // Deep sparking to ensure coverage
      sparkingConditions: {
        // Spark at ecosystem boundaries (geography.md vertical bands)
        boundaryPoints: [0.2, 0.4, 0.6, 0.8], // Between the 5 bands
        randomSparking: true
      },
      fishSpineBias: 0.9 // Maximum fish spine to ensure eastward progression
    }
  };
}

/**
 * Map pure geometric vertices to world vertices with ecosystems
 * Uses geography.md ecosystem band structure
 */
function mapVerticesToEcosystems(vertices: LichtenbergVertex[], config: LichtenbergConfig): WorldVertex[] {
  return vertices.map(vertex => {
    const ecosystem = determineEcosystem(vertex.x, vertex.y, config);
    return {
      ...vertex,
      ecosystem
    };
  });
}

/**
 * Determine ecosystem based on position using geography.md bands
 * 5 vertical bands: steppe:arid → grassland:temperate → forest:temperate → mountain:arid → jungle:tropical
 * With marsh:tropical interspersed in the eastern band (13% dithering)
 */
function determineEcosystem(x: number, y: number, config: LichtenbergConfig): EcosystemName {
  const normalizedX = x / config.width; // 0 to 1, west to east

  // Define the 5 ecosystem bands based on geography.md
  if (normalizedX < 0.2) {
    return EcosystemName.STEPPE_ARID;
  } else if (normalizedX < 0.4) {
    return EcosystemName.GRASSLAND_TEMPERATE;
  } else if (normalizedX < 0.6) {
    return EcosystemName.FOREST_TEMPERATE;
  } else if (normalizedX < 0.8) {
    return EcosystemName.MOUNTAIN_ARID;
  } else {
    // Eastern band - mostly jungle with 13% marsh dithering
    const hash = hashPosition(x, y);
    if (hash % 100 < 13) {
      return EcosystemName.MARSH_TROPICAL;
    }
    return EcosystemName.JUNGLE_TROPICAL;
  }
}

/**
 * Simple position-based hash for consistent marsh dithering
 */
function hashPosition(x: number, y: number): number {
  const xInt = Math.floor(x);
  const yInt = Math.floor(y);
  return (xInt * 73 + yInt * 37) % 1000;
}

/**
 * Convert world vertices to full Place objects
 */
function createPlacesFromVertices(worldVertices: WorldVertex[]): Place[] {
  return worldVertices.map(vertex => {
    const ecologicalProfile = ECOSYSTEM_PROFILES[vertex.ecosystem];

    // Convert geometric coordinates to world coordinates (100x100m Places)
    const worldX = Math.floor(vertex.x);
    const worldY = Math.floor(vertex.y);

    const place: Place = {
      id: `flux:place:${vertex.id}`,
      type: EntityType.PLACE,
      name: generatePlaceName(vertex.ecosystem, vertex.id),
      description: generatePlaceDescription(vertex.ecosystem),
      exits: {}, // Will be populated by connection analysis
      entities: {}, // No entities initially
      ecology: ecologicalProfile,
      weather: {
        temperature: ecologicalProfile.temperature[0], // Start with min temperature
        pressure: ecologicalProfile.pressure[0], // Start with min pressure
        humidity: ecologicalProfile.humidity[0], // Start with min humidity
        precipitation: 0, // Will be computed
        ppfd: 0, // Will be computed
        clouds: 0, // Will be computed
        ts: Date.now()
      },
      resources: {
        ts: Date.now(),
        nodes: {} // No resource nodes initially
      }
    };

    return place;
  });
}

/**
 * Generate a name for a place based on its ecosystem
 */
function generatePlaceName(ecosystem: EcosystemName, id: string): string {
  const prefixes = {
    [EcosystemName.STEPPE_ARID]: ['Windswept', 'Barren', 'Dry'],
    [EcosystemName.GRASSLAND_TEMPERATE]: ['Rolling', 'Green', 'Meadow'],
    [EcosystemName.FOREST_TEMPERATE]: ['Wooded', 'Shaded', 'Grove'],
    [EcosystemName.MOUNTAIN_ARID]: ['Rocky', 'Peak', 'Crag'],
    [EcosystemName.JUNGLE_TROPICAL]: ['Dense', 'Verdant', 'Canopy'],
    [EcosystemName.MARSH_TROPICAL]: ['Misty', 'Muddy', 'Boggy']
  };

  const suffixes = {
    [EcosystemName.STEPPE_ARID]: ['Plateau', 'Plain', 'Mesa'],
    [EcosystemName.GRASSLAND_TEMPERATE]: ['Field', 'Meadow', 'Prairie'],
    [EcosystemName.FOREST_TEMPERATE]: ['Grove', 'Glade', 'Thicket'],
    [EcosystemName.MOUNTAIN_ARID]: ['Peak', 'Ridge', 'Outcrop'],
    [EcosystemName.JUNGLE_TROPICAL]: ['Jungle', 'Canopy', 'Understory'],
    [EcosystemName.MARSH_TROPICAL]: ['Marsh', 'Wetland', 'Swamp']
  };

  // Extract numeric part from vertex ID (e.g., "vertex_123" -> "123")
  const numericId = id.replace(/[^0-9]/g, '');
  const idNumber = parseInt(numericId) || 0;

  const prefix = prefixes[ecosystem][idNumber % prefixes[ecosystem].length];
  const suffix = suffixes[ecosystem][Math.floor(idNumber / 10) % suffixes[ecosystem].length];

  return `${prefix} ${suffix}`;
}

/**
 * Generate a description for a place based on its ecosystem
 */
function generatePlaceDescription(ecosystem: EcosystemName): string {
  const descriptions = {
    [EcosystemName.STEPPE_ARID]: 'A dry, windswept expanse of hardy grasses and scattered shrubs under an endless sky.',
    [EcosystemName.GRASSLAND_TEMPERATE]: 'Rolling green hills dotted with wildflowers sway gently in the temperate breeze.',
    [EcosystemName.FOREST_TEMPERATE]: 'Tall deciduous trees create a canopy of dappled shade over the forest floor.',
    [EcosystemName.MOUNTAIN_ARID]: 'Jagged rocky peaks rise toward the sky, their surfaces scoured by wind and weather.',
    [EcosystemName.JUNGLE_TROPICAL]: 'Dense tropical vegetation creates a humid, verdant maze of vines and massive trees.',
    [EcosystemName.MARSH_TROPICAL]: 'Murky waters weave between patches of soggy ground and tangled wetland vegetation.'
  };

  return descriptions[ecosystem];
}



/**
 * Populate Place exits from Lichtenberg connections
 * Converts geometric connections between vertices into navigable exits between places
 */
function populatePlaceExits(places: Place[], connections: LichtenbergConnection[]): void {
  // Create a map from vertex ID to place for quick lookup
  const placeMap = new Map<string, Place>();
  places.forEach(place => {
    // Extract vertex ID from place ID (flux:place:vertex_123 -> vertex_123)
    const vertexId = place.id.replace('flux:place:', '');
    placeMap.set(vertexId, place);
  });

  // Available directions for connections (excluding UP/DOWN for ground-level connections)
  const connectionDirections = [
    Direction.NORTH,
    Direction.SOUTH,
    Direction.EAST,
    Direction.WEST,
    Direction.NORTHEAST,
    Direction.NORTHWEST,
    Direction.SOUTHEAST,
    Direction.SOUTHWEST,
  ];

  // Convert each connection into bidirectional exits
  connections.forEach((connection, index) => {
    const fromPlace = placeMap.get(connection.from);
    const toPlace = placeMap.get(connection.to);

    if (fromPlace && toPlace) {
      // Use available directions, cycling through them
      const directionIndex = index % connectionDirections.length;
      const exitDirection = connectionDirections[directionIndex];

      // Find reverse direction
      const reverseDirectionMap: Record<Direction, Direction> = {
        [Direction.NORTH]: Direction.SOUTH,
        [Direction.SOUTH]: Direction.NORTH,
        [Direction.EAST]: Direction.WEST,
        [Direction.WEST]: Direction.EAST,
        [Direction.NORTHEAST]: Direction.SOUTHWEST,
        [Direction.NORTHWEST]: Direction.SOUTHEAST,
        [Direction.SOUTHEAST]: Direction.NORTHWEST,
        [Direction.SOUTHWEST]: Direction.NORTHEAST,
        [Direction.UP]: Direction.DOWN,
        [Direction.DOWN]: Direction.UP,
        [Direction.IN]: Direction.OUT,
        [Direction.OUT]: Direction.IN,
        [Direction.FORWARD]: Direction.BACKWARD,
        [Direction.BACKWARD]: Direction.FORWARD,
        [Direction.LEFT]: Direction.RIGHT,
        [Direction.RIGHT]: Direction.LEFT,
        [Direction.UNKNOWN]: Direction.UNKNOWN,
      };

      const reverseDirection = reverseDirectionMap[exitDirection];

      // Create exit from fromPlace to toPlace
      fromPlace.exits[exitDirection] = {
        direction: exitDirection,
        label: `Path to ${toPlace.name}`,
        to: toPlace.id as PlaceURN
      };

      // Create reverse exit from toPlace to fromPlace
      toPlace.exits[reverseDirection] = {
        direction: reverseDirection,
        label: `Path to ${fromPlace.name}`,
        to: fromPlace.id as PlaceURN
      };
    }
  });

  console.log(`Populated exits for ${places.length} places from ${connections.length} connections`);
}

/**
 * Adjust ecosystem-specific connectivity patterns
 * Implements hybrid approach: additive for open terrain, selective removal for difficult terrain
 */
function adjustEcosystemConnectivity(places: Place[], seededRandom: SeededRandom): void {
  console.log('Adjusting ecosystem-specific connectivity...');

  // Group places by ecosystem for processing
  const placesByEcosystem = groupPlacesByEcosystem(places);

  // Apply ecosystem-specific adjustments
  Object.entries(placesByEcosystem).forEach(([ecosystem, ecosystemPlaces]) => {
    const ecosystemName = ecosystem as EcosystemName;
    applyEcosystemConnectivityRules(ecosystemPlaces, ecosystemName, placesByEcosystem, seededRandom);
  });

  const finalConnectionCount = countTotalConnections(places);
  console.log(`Connectivity adjustment complete. Final connections: ${finalConnectionCount}`);
}

/**
 * Group places by their ecosystem for targeted processing
 */
function groupPlacesByEcosystem(places: Place[]): Record<string, Place[]> {
  const grouped: Record<string, Place[]> = {};

  places.forEach(place => {
    const ecosystem = place.ecology.ecosystem;
    if (!grouped[ecosystem]) {
      grouped[ecosystem] = [];
    }
    grouped[ecosystem].push(place);
  });

  return grouped;
}

/**
 * Apply connectivity rules specific to each ecosystem type
 */
function applyEcosystemConnectivityRules(
  ecosystemPlaces: Place[],
  ecosystem: EcosystemName,
  placesByEcosystem: Record<string, Place[]>,
  seededRandom: SeededRandom
): void {
  const connectivityConfig = getEcosystemConnectivityConfig(ecosystem);

  console.log(`Adjusting ${ecosystem}: ${ecosystemPlaces.length} places, target ~${connectivityConfig.targetConnectionsPerPlace} connections/place`);

  // Phase 1: Add proximity connections for open terrain
  if (connectivityConfig.addProximityConnections) {
    const eligiblePlaces = getEligibleConnectionPlaces(ecosystem, placesByEcosystem);
    const allPlaces = Object.values(placesByEcosystem).flat();
    addProximityConnections(ecosystemPlaces, connectivityConfig.connectionRange, allPlaces, eligiblePlaces, seededRandom);
  }

  // Phase 2: Selectively remove connections for difficult terrain
  if (connectivityConfig.removeConnections) {
    const allPlaces = Object.values(placesByEcosystem).flat();
    removeExcessConnections(ecosystemPlaces, connectivityConfig.targetConnectionsPerPlace, allPlaces, seededRandom);
  }
}

/**
 * Get eligible places for connection based on ecosystem adjacency
 */
function getEligibleConnectionPlaces(
  ecosystem: EcosystemName,
  placesByEcosystem: Record<string, Place[]>
): Place[] {
  const eligiblePlaces: Place[] = [];

  // Always include places from the same ecosystem
  const sameEcosystemPlaces = placesByEcosystem[ecosystem] || [];
  eligiblePlaces.push(...sameEcosystemPlaces);

  // Define ecosystem adjacency (based on the 5-band layout: Steppe, Grassland, Forest, Mountain, Jungle)
  const adjacencyMap: Record<EcosystemName, EcosystemName[]> = {
    [EcosystemName.STEPPE_ARID]: [EcosystemName.GRASSLAND_TEMPERATE],
    [EcosystemName.GRASSLAND_TEMPERATE]: [EcosystemName.STEPPE_ARID, EcosystemName.FOREST_TEMPERATE],
    [EcosystemName.FOREST_TEMPERATE]: [EcosystemName.GRASSLAND_TEMPERATE, EcosystemName.MOUNTAIN_ARID],
    [EcosystemName.MOUNTAIN_ARID]: [EcosystemName.FOREST_TEMPERATE, EcosystemName.JUNGLE_TROPICAL],
    [EcosystemName.JUNGLE_TROPICAL]: [EcosystemName.MOUNTAIN_ARID, EcosystemName.MARSH_TROPICAL],
    [EcosystemName.MARSH_TROPICAL]: [EcosystemName.JUNGLE_TROPICAL] // Marsh is dithered within jungle
  };

  // Add places from adjacent ecosystems (but limit to prevent over-connection)
  const adjacentEcosystems = adjacencyMap[ecosystem] || [];
  adjacentEcosystems.forEach(adjacentEcosystem => {
    const adjacentPlaces = placesByEcosystem[adjacentEcosystem] || [];
    // Only add a subset of adjacent places to prevent over-connection
    const maxAdjacentConnections = Math.min(5, adjacentPlaces.length);
    eligiblePlaces.push(...adjacentPlaces.slice(0, maxAdjacentConnections));
  });

  return eligiblePlaces;
}

/**
 * Get connectivity configuration for each ecosystem type
 * connectionRange is now measured in graph hops, not geographic distance
 */
function getEcosystemConnectivityConfig(ecosystem: EcosystemName): {
  targetConnectionsPerPlace: number;
  connectionRange: number;
  addProximityConnections: boolean;
  removeConnections: boolean;
} {
  const configs = {
    [EcosystemName.GRASSLAND_TEMPERATE]: {
      targetConnectionsPerPlace: 3.0,
      connectionRange: 3, // 3 hops: creates shortcuts across open terrain
      addProximityConnections: true,
      removeConnections: false
    },
    [EcosystemName.STEPPE_ARID]: {
      targetConnectionsPerPlace: 3.0,
      connectionRange: 3, // 3 hops: wide open spaces allow long-range connections
      addProximityConnections: true,
      removeConnections: false
    },
    [EcosystemName.FOREST_TEMPERATE]: {
      targetConnectionsPerPlace: 2.2,
      connectionRange: 2, // 2 hops: trails exist but trees limit visibility
      addProximityConnections: true,
      removeConnections: true
    },
    [EcosystemName.MARSH_TROPICAL]: {
      targetConnectionsPerPlace: 1.8,
      connectionRange: 1, // 1 hop: difficult terrain limits new connections
      addProximityConnections: false,
      removeConnections: true
    },
    [EcosystemName.MOUNTAIN_ARID]: {
      targetConnectionsPerPlace: 1.4,
      connectionRange: 1, // 1 hop: rugged terrain severely limits passage
      addProximityConnections: false,
      removeConnections: true
    },
    [EcosystemName.JUNGLE_TROPICAL]: {
      targetConnectionsPerPlace: 2.0,
      connectionRange: 2, // 2 hops: some paths through dense vegetation
      addProximityConnections: true,
      removeConnections: true
    }
  };

  return configs[ecosystem] || configs[EcosystemName.GRASSLAND_TEMPERATE];
}

/**
 * Add proximity-based connections for open terrain ecosystems
 * Now uses graph distance (hops) instead of geographic distance
 */
function addProximityConnections(ecosystemPlaces: Place[], maxHops: number, allPlaces: Place[], eligiblePlaces: Place[], seededRandom: SeededRandom): void {
  let connectionsAdded = 0;

  ecosystemPlaces.forEach(place => {
    // Find nearby places within the ecosystem's hop range
    const nearbyPlaces = findNearbyPlaces(place, allPlaces, maxHops, eligiblePlaces, seededRandom);

    nearbyPlaces.forEach(nearbyPlace => {
      if (!hasExistingConnection(place, nearbyPlace)) {
        if (createBidirectionalConnection(place, nearbyPlace, seededRandom)) {
          connectionsAdded++;
        }
      }
    });
  });

  if (connectionsAdded > 0) {
    console.log(`  Added ${connectionsAdded} proximity connections`);
  }
}

/**
 * Remove excess connections to achieve target connectivity for difficult terrain
 */
function removeExcessConnections(ecosystemPlaces: Place[], targetConnectionsPerPlace: number, allPlaces: Place[], seededRandom: SeededRandom): void {
  let connectionsRemoved = 0;
  let connectionsPreserved = 0;

  ecosystemPlaces.forEach(place => {
    const currentConnections = Object.keys(place.exits).length;
    const excessConnections = currentConnections - targetConnectionsPerPlace;

    if (excessConnections > 0) {
      const connectionsToRemove = Math.floor(excessConnections);
      const initialConnections = currentConnections;

      removeRandomConnections(place, connectionsToRemove, allPlaces, seededRandom);

      const finalConnections = Object.keys(place.exits).length;
      const actuallyRemoved = initialConnections - finalConnections;
      const preserved = connectionsToRemove - actuallyRemoved;

      connectionsRemoved += actuallyRemoved;
      connectionsPreserved += preserved;
    }
  });

  if (connectionsRemoved > 0 || connectionsPreserved > 0) {
    console.log(`  Removed ${connectionsRemoved} excess connections, preserved ${connectionsPreserved} bridge connections`);
  }
}

/**
 * Find places within graph hop distance (relationship distance)
 * This creates realistic connections by following existing paths
 */
function findNearbyPlaces(place: Place, allPlaces: Place[], maxHops: number, eligiblePlaces: Place[], seededRandom: SeededRandom): Place[] {
  // BFS to find places within hop distance
  const visited = new Set<string>();
  const queue: Array<{place: Place, hops: number}> = [];
  const reachablePlaces: Place[] = [];

  queue.push({place: place, hops: 0});
  visited.add(place.id);

  while (queue.length > 0) {
    const {place: currentPlace, hops} = queue.shift()!;

    // If we're within hop range and this place is eligible, add it
    if (hops > 0 && hops <= maxHops && eligiblePlaces.includes(currentPlace)) {
      reachablePlaces.push(currentPlace);
    }

    // Continue searching if we haven't exceeded max hops
    if (hops < maxHops) {
      // Follow existing connections
      Object.values(currentPlace.exits).forEach(exit => {
        const connectedPlace = allPlaces.find(p => p.id === exit.to);
        if (connectedPlace && !visited.has(connectedPlace.id)) {
          visited.add(connectedPlace.id);
          queue.push({place: connectedPlace, hops: hops + 1});
        }
      });
    }
  }

  return seededRandom.shuffle(reachablePlaces).slice(0, 3); // Limit to 3 connections to prevent over-connectivity
}

/**
 * Check if two places already have a connection
 */
function hasExistingConnection(place1: Place, place2: Place): boolean {
  return Object.values(place1.exits).some(exit => exit.to === place2.id);
}

/**
 * Create bidirectional connection between two places
 */
function createBidirectionalConnection(place1: Place, place2: Place, seededRandom: SeededRandom): boolean {
  // Check if already connected
  if (hasExistingConnection(place1, place2)) {
    console.log(`  ⚠️  ${place1.name} and ${place2.name} are already connected`);
    return false;
  }

  // Find available directions
  const availableDirections = [
    Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST,
    Direction.NORTHEAST, Direction.NORTHWEST, Direction.SOUTHEAST, Direction.SOUTHWEST
  ];

  const usedDirections1 = Object.keys(place1.exits) as Direction[];
  const usedDirections2 = Object.keys(place2.exits) as Direction[];

  const availableForPlace1 = availableDirections.filter(dir => !usedDirections1.includes(dir));
  const availableForPlace2 = availableDirections.filter(dir => !usedDirections2.includes(dir));

  console.log(`  📍 Connecting ${place1.name} (${availableForPlace1.length} free dirs) ↔ ${place2.name} (${availableForPlace2.length} free dirs)`);

  if (availableForPlace1.length > 0 && availableForPlace2.length > 0) {
    const direction1 = availableForPlace1[seededRandom.nextInt(availableForPlace1.length)];
    const direction2 = getOppositeDirection(direction1);

    if (availableForPlace2.includes(direction2)) {
      place1.exits[direction1] = {
        direction: direction1,
        label: `Path to ${place2.name}`,
        to: place2.id as PlaceURN
      };

      place2.exits[direction2] = {
        direction: direction2,
        label: `Path to ${place1.name}`,
        to: place1.id as PlaceURN
      };

      console.log(`  ✅ Connected ${place1.name} → ${direction1} → ${place2.name} → ${direction2}`);
      return true;
    } else {
      console.log(`  ❌ Direction ${direction2} not available for ${place2.name}`);
    }
  } else {
    console.log(`  ❌ No available directions for connection`);
  }

  return false;
}

/**
 * Get opposite direction for bidirectional connections
 */
function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    [Direction.NORTH]: Direction.SOUTH,
    [Direction.SOUTH]: Direction.NORTH,
    [Direction.EAST]: Direction.WEST,
    [Direction.WEST]: Direction.EAST,
    [Direction.NORTHEAST]: Direction.SOUTHWEST,
    [Direction.NORTHWEST]: Direction.SOUTHEAST,
    [Direction.SOUTHEAST]: Direction.NORTHWEST,
    [Direction.SOUTHWEST]: Direction.NORTHEAST,
    [Direction.UP]: Direction.DOWN,
    [Direction.DOWN]: Direction.UP,
    [Direction.IN]: Direction.OUT,
    [Direction.OUT]: Direction.IN,
    [Direction.FORWARD]: Direction.BACKWARD,
    [Direction.BACKWARD]: Direction.FORWARD,
    [Direction.LEFT]: Direction.RIGHT,
    [Direction.RIGHT]: Direction.LEFT,
    [Direction.UNKNOWN]: Direction.UNKNOWN,
  };

  return opposites[direction] || Direction.UNKNOWN;
}

/**
 * Check if the entire graph remains connected using BFS
 */
function isGraphConnected(places: Place[]): boolean {
  if (places.length <= 1) return true;

  // Start BFS from the first place
  const visited = new Set<string>();
  const queue = [places[0].id];
  visited.add(places[0].id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentPlace = places.find(p => p.id === currentId);

    if (currentPlace) {
      // Follow all exits from this place
      Object.values(currentPlace.exits).forEach(exit => {
        if (!visited.has(exit.to)) {
          visited.add(exit.to);
          queue.push(exit.to);
        }
      });
    }
  }

  // All places should be reachable
  return visited.size === places.length;
}

/**
 * Find all bridge edges in the graph using Tarjan's algorithm
 */
function findBridges(places: Place[]): Set<string> {
  const bridges = new Set<string>();
  const visited = new Set<string>();
  const discoveryTime = new Map<string, number>();
  const lowTime = new Map<string, number>();
  const parent = new Map<string, string>();
  let time = 0;

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const place of places) {
    adj.set(place.id, []);
  }

  for (const place of places) {
    Object.values(place.exits).forEach(exit => {
      adj.get(place.id)?.push(exit.to);
    });
  }

  function bridgeUtil(u: string): void {
    visited.add(u);
    discoveryTime.set(u, time);
    lowTime.set(u, time);
    time++;

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        parent.set(v, u);
        bridgeUtil(v);

        // Check if the subtree rooted at v has a connection to ancestors of u
        lowTime.set(u, Math.min(lowTime.get(u)!, lowTime.get(v)!));

        // If the lowest vertex reachable from subtree under v is below u in DFS tree, then u-v is a bridge
        if (lowTime.get(v)! > discoveryTime.get(u)!) {
          bridges.add(`${u}-${v}`);
          bridges.add(`${v}-${u}`); // Bidirectional
        }
      } else if (v !== parent.get(u)) {
        // Back edge
        lowTime.set(u, Math.min(lowTime.get(u)!, discoveryTime.get(v)!));
      }
    }
  }

  // Call the recursive helper function for all vertices
  for (const place of places) {
    if (!visited.has(place.id)) {
      bridgeUtil(place.id);
    }
  }

  return bridges;
}

/**
 * Remove random connections from a place while preserving GLOBAL graph connectivity
 */
function removeRandomConnections(place: Place, count: number, allPlaces?: Place[], seededRandom: SeededRandom = new SeededRandom(42)): void {
  const exitDirections = Object.keys(place.exits) as Direction[];

  // If we don't have access to all places, fall back to local connectivity preservation
  if (!allPlaces) {
    const maxRemovable = Math.max(0, exitDirections.length - 1);
    const toRemove = Math.min(count, maxRemovable);

    for (let i = 0; i < toRemove; i++) {
      if (exitDirections.length > 1) {
        const randomIndex = seededRandom.nextInt(exitDirections.length);
        const directionToRemove = exitDirections.splice(randomIndex, 1)[0];
        delete place.exits[directionToRemove];
      }
    }
    return;
  }

  // Single-pass bridge detection for efficiency
  const bridges = findBridges(allPlaces);

  // Only remove non-bridge connections
  let removed = 0;
  const shuffledDirections = seededRandom.shuffle([...exitDirections]);

  for (const direction of shuffledDirections) {
    if (removed >= count) break;

    const exit = place.exits[direction];
    if (!exit) continue;

    // Check if this edge is a bridge
    const edgeKey = `${place.id}-${exit.to}`;
    if (bridges.has(edgeKey)) {
      console.log(`  Preserved bridge connection ${place.name} → ${direction}`);
      continue;
    }

    // Safe to remove - not a bridge
    // CRITICAL: Remove connection from BOTH sides to maintain bidirectionality
    delete place.exits[direction];

    // Find and remove the reverse connection
    const targetPlace = allPlaces.find(p => p.id === exit.to);
    if (targetPlace) {
      const reverseDirection = getOppositeDirection(direction);
      if (targetPlace.exits[reverseDirection] && targetPlace.exits[reverseDirection].to === place.id) {
        delete targetPlace.exits[reverseDirection];
        console.log(`  Safely removed bidirectional connection ${place.name} ↔ ${targetPlace.name}`);
      } else {
        console.log(`  Removed unidirectional connection ${place.name} → ${direction}`);
      }
    }

    removed++;
    console.log(`  Safely removed connection ${place.name} → ${direction}`);
  }
}

/**
 * Count total connections across all places
 */
function countTotalConnections(places: Place[]): number {
  return places.reduce((total, place) => total + Object.keys(place.exits).length, 0);
}

/**
 * Ensure global connectivity by reconnecting disconnected components
 */
function ensureGlobalConnectivity(places: Place[], seededRandom: SeededRandom): void {
  let attempts = 0;
  const maxAttempts = 20;

  while (!isGraphConnected(places) && attempts < maxAttempts) {
    attempts++;
    console.log(`⚠️  Graph connectivity broken - repair attempt ${attempts}...`);

    // Find all disconnected components
    const components: Place[][] = [];
    const visited = new Set<string>();

    for (const place of places) {
      if (!visited.has(place.id)) {
        const component: Place[] = [];
        const queue = [place];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current.id)) continue;

          visited.add(current.id);
          component.push(current);

          Object.values(current.exits).forEach(exit => {
            const connectedPlace = places.find(p => p.id === exit.to);
            if (connectedPlace && !visited.has(connectedPlace.id)) {
              queue.push(connectedPlace);
            }
          });
        }

        components.push(component);
      }
    }

    console.log(`Found ${components.length} disconnected components`);

    if (components.length <= 1) {
      console.log('✅ Global connectivity achieved');
      break;
    }

    // Connect the largest component to the next largest
    components.sort((a, b) => b.length - a.length);
    const largestComponent = components[0];
    const nextComponent = components[1];

    // Find the closest places between these two components
    let minDistance = Infinity;
    let bestConnection: [Place, Place] | null = null;

    for (const place1 of largestComponent) {
      for (const place2 of nextComponent) {
        // Use a simple heuristic based on place ID numbers
        const id1 = parseInt(place1.id.split('_')[1] || '0');
        const id2 = parseInt(place2.id.split('_')[1] || '0');
        const distance = Math.abs(id1 - id2);

        if (distance < minDistance) {
          minDistance = distance;
          bestConnection = [place1, place2];
        }
      }
    }

    if (bestConnection) {
      const [place1, place2] = bestConnection;
      const success = createBidirectionalConnection(place1, place2, seededRandom);
      if (success) {
        console.log(`🔗 Connected ${largestComponent.length} places to ${nextComponent.length} places via ${place1.name} ↔ ${place2.name}`);

        // Verify connection was actually created
        const place1ExitCount = Object.keys(place1.exits).length;
        const place2ExitCount = Object.keys(place2.exits).length;
        console.log(`  📊 ${place1.name} now has ${place1ExitCount} exits, ${place2.name} now has ${place2ExitCount} exits`);
      } else {
        // Try other connection pairs from these components
        let alternativeFound = false;
        for (const alt1 of largestComponent) {
          for (const alt2 of nextComponent) {
            if ((alt1 !== place1 || alt2 !== place2) && createBidirectionalConnection(alt1, alt2, seededRandom)) {
              console.log(`🔗 Connected ${largestComponent.length} places to ${nextComponent.length} places via ${alt1.name} ↔ ${alt2.name} (alternative)`);

              // Verify alternative connection was actually created
              const alt1ExitCount = Object.keys(alt1.exits).length;
              const alt2ExitCount = Object.keys(alt2.exits).length;
              console.log(`  📊 ${alt1.name} now has ${alt1ExitCount} exits, ${alt2.name} now has ${alt2ExitCount} exits`);

              alternativeFound = true;
              break;
            }
          }
          if (alternativeFound) break;
        }

        if (!alternativeFound) {
          console.error('❌ Could not establish any connection between components');
          break;
        }
      }
    } else {
      console.error('❌ Could not find connection points between components');
      break;
    }
  }

  // Final verification
  if (isGraphConnected(places)) {
    console.log('✅ Global connectivity restored');
  } else {
    console.error(`❌ Failed to restore global connectivity after ${attempts} attempts`);
  }
}

/**
 * Calculate connection statistics from places (updated signature)
 */
function calculateConnectionStats(places: Place[]): { reciprocal: number; total: number } {
  const totalConnections = countTotalConnections(places);

  // For now, assume all connections are reciprocal (bidirectional)
  // In a real implementation, we'd analyze actual bidirectionality
  return {
    reciprocal: Math.floor(totalConnections / 2), // Each bidirectional connection counts as 2 exits
    total: totalConnections
  };
}
