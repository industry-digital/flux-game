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

/**
 * Main world generation function
 * Generates world using multiple Lichtenberg figures (one per ecosystem), then connects them
 */
export function generateWorld(config: WorldGenerationConfig): WorldGenerationResult {
  // 1. Generate Lichtenberg figures for each ecosystem band
  const ecosystemFigures = generateEcosystemFigures(config);

  // 2. Connect adjacent ecosystem figures
  const connectedFigure = connectEcosystemFigures(ecosystemFigures, config);

  // 3. Map vertices to ecosystems based on their origin band
  const worldVertices = mapVerticesToEcosystems(connectedFigure.vertices, connectedFigure.config);

  // 4. Convert to full Place objects
  const places = createPlacesFromVertices(worldVertices);

  // 5. Calculate connection statistics
  const connections = calculateConnectionStats(connectedFigure.connections);

  return {
    places,
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
      length: distance
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
 * Calculate connection statistics
 */
function calculateConnectionStats(connections: any[]): { reciprocal: number; total: number } {
  // For now, assume all connections are reciprocal (bidirectional)
  // In a real implementation, we'd analyze the graph topology
  return {
    reciprocal: connections.length,
    total: connections.length
  };
}
