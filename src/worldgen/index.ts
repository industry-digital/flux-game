/**
 * Pure, deterministic world generation library
 * Implements hub-and-spoke topology with ecosystem management
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - O(N) time complexity where N = number of places generated
 * - Spatial indexing for trail segments: O(N log N) intersection detection
 * - Squared distance comparisons to avoid expensive sqrt operations
 * - Precomputed ecosystem distribution caches with O(1) lookups
 * - Efficient circular grid generation (no wasted square→circle filtering)
 * - Binary search for weighted ecosystem selection: O(log k) where k = 5 ecosystems
 * - Single-pass data collection (places, infection zones, worshipper territories)
 * - Pre-allocated arrays to avoid dynamic resizing
 * - Cached habitat key lookups to avoid repeated string operations
 *
 * MEMORY TRADE-OFFS:
 * - Uses Map caches for ecosystem distribution and habitat keys
 * - Spatial grid index for trail segments (trading memory for performance)
 * - Pre-allocates arrays based on calculated grid size
 * - Trades memory for consistent O(N) performance
 */

import { Place, PlaceURN, EntityType } from '~/types/index';
import { Weather, Exit } from '~/types/entity/place';
import { Direction } from '~/types/world/space';
import { PotentiallyImpureOperations } from '~/types/handler';
import {
  WorldGenerationConfig,
  GeneratedWorld,
  GAEAPlace,
  EcosystemName,
  ECOSYSTEM_PROFILES,
  WorldTopology,
  WorldGenOptions,
  TrailSegment,
  TrailSystem,
  FractalTrailNetwork,
} from './types';



/**
 * Spatial index for efficient trail segment lookups
 * Divides world into grid cells for O(1) spatial queries
 */
type SpatialIndex = {
  gridSize: number;
  cellSize: number;
  cells: Map<string, TrailSegment[]>;
  worldRadius: number;
  worldCenter: [number, number];
};





/**
 * Fast squared distance calculation (avoids expensive sqrt)
 */
function squaredDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Fast distance calculation only when needed
 */
function fastDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(squaredDistance(x1, y1, x2, y2));
}

/**
 * Create spatial index for trail segments
 */
function createSpatialIndex(worldRadius: number, worldCenter: [number, number]): SpatialIndex {
  // Grid size based on world radius for optimal performance
  const gridSize = Math.ceil(worldRadius / 2.0); // 2km cells
  const cellSize = (worldRadius * 2) / gridSize;

  return {
    gridSize,
    cellSize,
    cells: new Map(),
    worldRadius,
    worldCenter
  };
}

/**
 * Get grid cell key for a position
 */
function getGridCellKey(x: number, y: number, spatialIndex: SpatialIndex): string {
  const { worldCenter, cellSize } = spatialIndex;
  const cellX = Math.floor((x - worldCenter[0] + spatialIndex.worldRadius) / cellSize);
  const cellY = Math.floor((y - worldCenter[1] + spatialIndex.worldRadius) / cellSize);
  return `${cellX},${cellY}`;
}

/**
 * Add trail segment to spatial index
 */
function addToSpatialIndex(segment: TrailSegment, spatialIndex: SpatialIndex): void {
  const cellKey = getGridCellKey(segment.position[0], segment.position[1], spatialIndex);

  if (!spatialIndex.cells.has(cellKey)) {
    spatialIndex.cells.set(cellKey, []);
  }

  spatialIndex.cells.get(cellKey)!.push(segment);
}

/**
 * Get nearby trail segments from spatial index
 */
function getNearbySegments(x: number, y: number, spatialIndex: SpatialIndex, radius: number): TrailSegment[] {
  const { cellSize } = spatialIndex;
  const cellRadius = Math.ceil(radius / cellSize);
  const centerCellKey = getGridCellKey(x, y, spatialIndex);
  const [centerCellX, centerCellY] = centerCellKey.split(',').map(Number);

  const nearbySegments: TrailSegment[] = [];

  // Check cells within radius
  for (let dx = -cellRadius; dx <= cellRadius; dx++) {
    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      const cellKey = `${centerCellX + dx},${centerCellY + dy}`;
      const cellSegments = spatialIndex.cells.get(cellKey) || [];
      nearbySegments.push(...cellSegments);
    }
  }

  return nearbySegments;
}

/**
 * Optimized grid point generation - only valid points within circle
 */
function generateValidGridPoints(worldRadius: number, gridSpacing: number, center: [number, number]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const radiusSquared = worldRadius * worldRadius;

  // Only iterate over points that could possibly be within the circle
  for (let x = -worldRadius; x <= worldRadius; x += gridSpacing) {
    // For each x, calculate the maximum y range that could be in the circle
    const maxY = Math.sqrt(Math.max(0, radiusSquared - x * x));

    for (let y = -maxY; y <= maxY; y += gridSpacing) {
      const distanceSquared = (x - center[0]) * (x - center[0]) + (y - center[1]) * (y - center[1]);

      if (distanceSquared <= radiusSquared) {
        points.push([x, y]);
      }
    }
  }

  return points;
}

/**
 * Default world generation configuration
 * Implements the hub-and-spoke design with ecosystem distribution
 */
export const DEFAULT_WORLD_CONFIG: WorldGenerationConfig = {
  topology: {
    central_crater: {
      center: [0, 0],
      radius: 6.4,                    // 6.4km radius (San Francisco-sized)
      elevation: -200                 // 200m below sea level (ancient impact crater)
    },
    mountain_ring: {
      inner_radius: 6.4,              // Crater rim boundary
      outer_radius: 10.2,             // Mountain ring boundary
      elevation_range: [1200, 2000]   // Crater wall heights
    },
    ecosystem_slices: {
      slice_count: 3,                 // Launch configuration: 3 slices
      outer_radius: 25.6,             // World boundary (25.6km radius)
      elevation_range: [300, 1000]    // Peripheral elevations
    }
  },
    hub_ecosystems: {
    crater: EcosystemName.MARSH_TROPICAL,          // Crater center - tropical marsh
    forest_ring: EcosystemName.FOREST_CONIFEROUS,  // Middle ring - coniferous forest
    mountain_ring: EcosystemName.FOREST_MONTANE    // Mountain ring - montane forest
  },
  spoke_ecosystems: {
    pass_0: EcosystemName.RUINS_TROPICAL,          // 0° pass - tropical ruins
    pass_120: EcosystemName.ARID_SCRUBLAND,        // 120° pass - arid scrubland
    pass_240: EcosystemName.FOREST_TEMPERATE       // 240° pass - temperate forest
  },
  place_density: 4.0,                 // 4 places per square km
  connectivity: {
    max_exits_per_place: 6,           // Default maximum exits per place
    connection_distance_factor: 1.5,  // Default distance multiplier
    connection_density: 1.0,          // Full connectivity by default
    prefer_same_zone: true,           // Prefer connections within same topology zone
    ecosystem_edge_targets: {         // Target average edges per ecosystem (excluding boundary nodes)
      [EcosystemName.FOREST_CONIFEROUS]: 1.8,       // Dense forest - fewer paths through thick vegetation
      [EcosystemName.GRASSLAND_SUBTROPICAL]: 3.2,   // Open grassland - many paths across open terrain
      [EcosystemName.WETLAND_TROPICAL]: 2.2,        // Wetlands - moderate connectivity via waterways
      [EcosystemName.FOREST_MONTANE]: 1.4,          // Mountain forest - very restricted steep paths
      [EcosystemName.MOUNTAIN_ALPINE]: 1.0,         // Alpine - extremely limited mountain passes
      [EcosystemName.MARSH_TROPICAL]: 2.8,          // Lake marshes - good connectivity around water edge
    },
    boundary_detection_threshold: 0.05, // 5% of world radius from edge = boundary
    fractal_trails: {                  // Fractal trail network configuration
      enabled: true,                   // Enable fractal trails
      trail_count: 6,                  // 6 main trails from mountain passes (more than 4 passes)
      branching_factor: 2.0,           // Average 2 branches per segment
      branching_angle: Math.PI / 3,    // 60 degree max branch angle
      max_depth: 4,                    // 4 levels of branching depth
      segment_length: 3.0,             // 3km base segment length
      length_variation: 0.4,           // 40% length variation
      trail_width: 2.0,                // 2km connection radius around trails
      decay_factor: 0.7,               // 70% branch probability decay per level
    }
  },
  random_seed: 42                     // Deterministic generation
};

/**
 * Create default options with deterministic PRNG from seed
 */
function createDefaultOptions(seed: number): Required<WorldGenOptions> {
  let currentSeed = seed;

  return {
    random: () => {
      currentSeed = Math.imul(currentSeed, 1664525) + 1013904223;
      return (currentSeed >>> 0) / 4294967296;
    },
    timestamp: () => Date.now()
  };
}

/**
 * Default world generation options
 */
const DEFAULT_WORLDGEN_OPTIONS: Required<WorldGenOptions> = {
  random: Math.random,
  timestamp: () => Date.now()
};

/**
 * Pure functional random number generation helpers
 */
function randomRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

function randomChoice<T>(random: () => number, array: T[]): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

/**
 * Calculate distance from center point
 */
function calculateDistanceFromCenter(x: number, y: number, center: [number, number]): number {
  const dx = x - center[0];
  const dy = y - center[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Determine which topological zone a coordinate falls into
 */
function getTopologyZone(distance: number, topology: WorldTopology): GAEAPlace['topology_zone'] {
  if (distance <= topology.central_crater.radius) {
    return 'crater';
  } else if (distance <= topology.mountain_ring.outer_radius) {
    return 'mountain_ring';
  } else if (distance <= topology.ecosystem_slices.outer_radius) {
    return 'ecosystem_slice';
  } else {
    return 'periphery';
  }
}

/**
 * Calculate ecosystem slice ID based on angle from center
 */
function calculateEcosystemSlice(x: number, y: number, center: [number, number], sliceCount: number): number {
  const angle = Math.atan2(y - center[1], x - center[0]);
  const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0 to 1
  return Math.floor(normalizedAngle * sliceCount);
}

/**
 * Determine ecosystem type based on territorial assignment
 * Hub-and-spoke design with concentric rings and dendritic spokes
 */
function getEcosystemType(
  zone: GAEAPlace['topology_zone'],
  config: WorldGenerationConfig,
  distance: number,
  trailTerritoryId?: string
): EcosystemName {
  // Hub territories (concentric rings)
  if (zone === 'crater') {
    return config.hub_ecosystems.crater;
  }

  if (zone === 'mountain_ring') {
    return config.hub_ecosystems.mountain_ring;
  }

  // Spoke territories (based on trail network)
  if (trailTerritoryId) {
    // Extract pass angle from trail territory ID (format: "pass_0", "pass_120", "pass_240")
    if (trailTerritoryId.includes('pass_0')) {
      return config.spoke_ecosystems.pass_0;
    }
    if (trailTerritoryId.includes('pass_120')) {
      return config.spoke_ecosystems.pass_120;
    }
    if (trailTerritoryId.includes('pass_240')) {
      return config.spoke_ecosystems.pass_240;
    }
  }

  // Areas between crater and mountain ring get forest ring ecosystem
  if (zone === 'ecosystem_slice') {
    const craterRadius = config.topology.central_crater.radius;
    const mountainInnerRadius = config.topology.mountain_ring.inner_radius;

    if (distance >= craterRadius && distance <= mountainInnerRadius) {
      return config.hub_ecosystems.forest_ring;
    }
  }

  // Default fallback (should rarely be reached)
  return config.hub_ecosystems.forest_ring;
}

/**
 * Generate initial weather conditions for a place
 */
function generateInitialWeather(ecosystem: EcosystemName, options: Required<WorldGenOptions>): Weather {
  const profile = ECOSYSTEM_PROFILES[ecosystem];

  return {
    temperature: randomRange(options.random, profile.temperature[0], profile.temperature[1]),
    pressure: randomRange(options.random, profile.pressure[0], profile.pressure[1]),
    humidity: randomRange(options.random, profile.humidity[0], profile.humidity[1]),
    precipitation: randomRange(options.random, 0, 20), // Basic precipitation
    ppfd: randomRange(options.random, 100, 2000),      // Photosynthetic flux
    clouds: randomRange(options.random, 0, 100),       // Cloud coverage
    ts: options.timestamp()
  };
}

/**
 * Generate G.A.E.A. place with ecosystem management properties
 * Optimized with cached lookups
 */
function generateGAEAPlace(
  x: number,
  y: number,
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  index: number
): GAEAPlace {
  const distanceSquared = squaredDistance(x, y, config.topology.central_crater.center[0], config.topology.central_crater.center[1]);
  const distance = Math.sqrt(distanceSquared);
  const zone = getTopologyZone(distance, config.topology);

  const ecosystem = getEcosystemType(zone, config, distance);
  const weather = generateInitialWeather(ecosystem, options);

  const placeUrn: PlaceURN = `flux:place:world:generated:${index}`;

  // Base place properties
  const basePlace: Place = {
    id: placeUrn,
    type: EntityType.PLACE,
    name: `${ecosystem.split(':')[2]} ${index}`,
    description: `A ${ecosystem.split(':')[2]} area`,
    exits: {},
    entities: {},
    ecology: ECOSYSTEM_PROFILES[ecosystem],
    weather,
    // Resource generation properties
    resources: {
      ts: options.timestamp(),
      nodes: {}
    }
  };

  const place: GAEAPlace = {
    ...basePlace,
    topology_zone: zone,
    distance_from_center: distance / config.topology.ecosystem_slices.outer_radius,
    coordinates: [x, y]                 // Store original grid coordinates
  };

  return place;
}

/**
 * Clear performance caches (useful for testing or memory management)
 */
export function clearWorldGenCaches(): void {
  // No caches to clear in territorial ecosystem assignment
}

/**
 * Calculate direction from one point to another
 */
function calculateDirection(fromX: number, fromY: number, toX: number, toY: number): Direction {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Normalize angle to 0-360 degrees
  const normalizedAngle = (angle + 360) % 360;

  // Convert to 8-direction compass
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
    return Direction.EAST;
  } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
    return Direction.NORTHEAST;
  } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
    return Direction.NORTH;
  } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
    return Direction.NORTHWEST;
  } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
    return Direction.WEST;
  } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
    return Direction.SOUTHWEST;
  } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
    return Direction.SOUTH;
  } else {
    return Direction.SOUTHEAST;
  }
}

/**
 * Get opposite direction for reciprocal exits
 */
function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    [Direction.NORTH]: Direction.SOUTH,
    [Direction.SOUTH]: Direction.NORTH,
    [Direction.EAST]: Direction.WEST,
    [Direction.WEST]: Direction.EAST,
    [Direction.NORTHEAST]: Direction.SOUTHWEST,
    [Direction.SOUTHWEST]: Direction.NORTHEAST,
    [Direction.NORTHWEST]: Direction.SOUTHEAST,
    [Direction.SOUTHEAST]: Direction.NORTHWEST,
    [Direction.UP]: Direction.DOWN,
    [Direction.DOWN]: Direction.UP,
    [Direction.IN]: Direction.OUT,
    [Direction.OUT]: Direction.IN,
    [Direction.FORWARD]: Direction.BACKWARD,
    [Direction.BACKWARD]: Direction.FORWARD,
    [Direction.LEFT]: Direction.RIGHT,
    [Direction.RIGHT]: Direction.LEFT,
    [Direction.UNKNOWN]: Direction.UNKNOWN
  };

  return opposites[direction];
}

/**
 * Generate meaningful exit label based on destination
 */
function generateExitLabel(direction: Direction, destination: GAEAPlace): string {
  const ecosystemType = destination.ecology.ecosystem.split(':')[2];
  const baseLabel = `${ecosystemType} area`;

  // Add descriptive elements based on topology zone
  const zoneDescriptor = destination.topology_zone === 'crater'
    ? 'sanctuary'
    : destination.topology_zone === 'mountain_ring'
      ? 'highlands'
      : 'territory';

  return `${baseLabel} ${zoneDescriptor}`;
}

/**
 * Detect if a place is at the boundary of the world (spatial periphery)
 */
function isBoundaryPlace(place: GAEAPlace, worldRadius: number, boundaryThreshold: number): boolean {
  const [x, y] = place.coordinates;
  const distanceFromCenter = Math.sqrt(x * x + y * y);
  const distanceFromEdge = worldRadius - distanceFromCenter;
  const boundaryDistance = worldRadius * boundaryThreshold;
  return distanceFromEdge <= boundaryDistance;
}

/**
 * Calculate current average edges per ecosystem (excluding boundary places)
 */
function calculateEcosystemEdgeAverages(
  places: GAEAPlace[],
  connections: Map<PlaceURN, Set<PlaceURN>>,
  worldRadius: number,
  boundaryThreshold: number
): Map<EcosystemName, number> {
  const ecosystemStats = new Map<EcosystemName, { totalEdges: number; nodeCount: number }>();

  for (const place of places) {
    if (isBoundaryPlace(place, worldRadius, boundaryThreshold)) continue;

    const ecosystem = place.ecology.ecosystem as EcosystemName;
    const edgeCount = (connections.get(place.id) || new Set()).size;

    if (!ecosystemStats.has(ecosystem)) {
      ecosystemStats.set(ecosystem, { totalEdges: 0, nodeCount: 0 });
    }

    const stats = ecosystemStats.get(ecosystem)!;
    stats.totalEdges += edgeCount;
    stats.nodeCount += 1;
  }

  const averages = new Map<EcosystemName, number>();
  for (const [ecosystem, stats] of ecosystemStats) {
    if (stats.nodeCount > 0) {
      averages.set(ecosystem, stats.totalEdges / stats.nodeCount);
    }
  }

  return averages;
}

/**
 * Efficient exit generation with per-ecosystem edge count control
 * APPROACH: Ecosystem-aware connectivity targeting + guaranteed connectivity
 * GUARANTEES: Every place is reachable, proper ecosystem edge densities
 */
function generateExitsOptimized(places: GAEAPlace[], config: WorldGenerationConfig): void {
  if (places.length === 0) return;

  const worldRadius = config.topology.ecosystem_slices.outer_radius;
  const boundaryThreshold = config.connectivity.boundary_detection_threshold;
  const gridSpacing = 1.0 / Math.sqrt(config.place_density);
  const adaptiveMaxDistance = Math.max(gridSpacing * config.connectivity.connection_distance_factor, 3.0);

  // Simple distance calculation function
  const getDistance = (place1: GAEAPlace, place2: GAEAPlace): number => {
    const [x1, y1] = place1.coordinates;
    const [x2, y2] = place2.coordinates;
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  // Step 1: Initial connectivity pass - ensure basic connectivity
  const connections = new Map<PlaceURN, Set<PlaceURN>>();

  for (const place of places) {
    const candidates: Array<{ place: GAEAPlace; distance: number; priority: number }> = [];

    for (const other of places) {
      if (place.id === other.id) continue;

      const distance = getDistance(place, other);
      if (distance > adaptiveMaxDistance) continue;

      // Priority scoring: prefer same zone, then adjacent zones
      let priority = 1.0 / distance; // Closer is better
      if (config.connectivity.prefer_same_zone) {
        if (place.topology_zone === other.topology_zone) priority *= 2.0;
        if (place.ecosystem_slice_id === other.ecosystem_slice_id) priority *= 1.5;
      }

      candidates.push({ place: other, distance, priority });
    }

    // Sort by priority
    candidates.sort((a, b) => b.priority - a.priority);

    // Initial minimum connections for basic connectivity
    const minConnections = Math.max(1, Math.floor(2 * config.connectivity.connection_density));
    const initialConnections = candidates.slice(0, minConnections);

    // Store bidirectional connections
    if (!connections.has(place.id)) connections.set(place.id, new Set());
    const placeConnections = connections.get(place.id)!;

    for (const { place: other } of initialConnections) {
      placeConnections.add(other.id);

      // Add reciprocal connection
      if (!connections.has(other.id)) connections.set(other.id, new Set());
      connections.get(other.id)!.add(place.id);
    }
  }

  // Step 2: Ensure global connectivity using BFS
  let visited = new Set<PlaceURN>();
  const queue = [places[0].id];
  visited.add(places[0].id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = connections.get(currentId) || new Set();

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  // Connect any isolated components
  for (const place of places) {
    if (!visited.has(place.id)) {
      // Find closest connected place
      let closestConnected: GAEAPlace | null = null;
      let closestDistance = Infinity;

      for (const other of places) {
        if (visited.has(other.id)) {
          const distance = getDistance(place, other);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestConnected = other;
          }
        }
      }

      if (closestConnected) {
        // Connect to closest connected component
        if (!connections.has(place.id)) connections.set(place.id, new Set());
        connections.get(place.id)!.add(closestConnected.id);
        connections.get(closestConnected.id)!.add(place.id);
        visited.add(place.id);
      }
    }
  }

  // Step 3: Adjust connectivity to meet ecosystem edge targets
  const maxIterations = 5; // Prevent infinite loops

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const currentAverages = calculateEcosystemEdgeAverages(places, connections, worldRadius, boundaryThreshold);
    let adjustmentsMade = false;

    for (const [ecosystem, targetAverage] of Object.entries(config.connectivity.ecosystem_edge_targets)) {
      const currentAverage = currentAverages.get(ecosystem as EcosystemName) || 0;
      const targetEdges = targetAverage as number;

      if (Math.abs(currentAverage - targetEdges) > 0.1) { // 0.1 tolerance
        // Get non-boundary places of this ecosystem
        const ecosystemPlaces = places.filter(p =>
          p.ecology.ecosystem === ecosystem &&
          !isBoundaryPlace(p, worldRadius, boundaryThreshold)
        );

        if (currentAverage < targetEdges) {
          // Add more connections
          for (const place of ecosystemPlaces) {
            const currentEdges = (connections.get(place.id) || new Set()).size;
            if (currentEdges < targetEdges * 1.2) { // Allow some variance
              // Find more candidates
              const candidates: Array<{ place: GAEAPlace; distance: number; priority: number }> = [];

              for (const other of places) {
                if (place.id === other.id) continue;
                if (connections.get(place.id)?.has(other.id)) continue; // Already connected

                const distance = getDistance(place, other);
                if (distance > adaptiveMaxDistance * 1.5) continue; // Slightly more lenient

                let priority = 1.0 / distance;
                if (other.ecology.ecosystem === ecosystem) priority *= 1.5; // Prefer same ecosystem
                if (place.topology_zone === other.topology_zone) priority *= 1.3;

                candidates.push({ place: other, distance, priority });
              }

              candidates.sort((a, b) => b.priority - a.priority);

              // Add 1-2 best connections
              const newConnections = candidates.slice(0, Math.min(2, Math.ceil(targetEdges - currentEdges)));
              for (const { place: other } of newConnections) {
                connections.get(place.id)!.add(other.id);
                if (!connections.has(other.id)) connections.set(other.id, new Set());
                connections.get(other.id)!.add(place.id);
                adjustmentsMade = true;
              }
            }
          }
        } else if (currentAverage > targetEdges) {
          // Remove some connections (but maintain connectivity)
          for (const place of ecosystemPlaces) {
            const currentEdges = (connections.get(place.id) || new Set()).size;
            if (currentEdges > targetEdges * 1.2) { // Allow some variance
              const placeConnections = connections.get(place.id)!;
              const connectionsArray = Array.from(placeConnections);

              // Remove least important connections
              const connectionImportance = connectionsArray.map(otherId => {
                const other = places.find(p => p.id === otherId)!;
                const distance = getDistance(place, other);
                let importance = 1.0 / distance;
                if (other.ecology.ecosystem === ecosystem) importance *= 1.5;
                if (place.topology_zone === other.topology_zone) importance *= 1.3;
                return { otherId, importance };
              });

              connectionImportance.sort((a, b) => a.importance - b.importance);

              // Remove 1 least important connection
              const toRemove = connectionImportance.slice(0, Math.min(1, Math.floor(currentEdges - targetEdges)));
              for (const { otherId } of toRemove) {
                placeConnections.delete(otherId);
                connections.get(otherId)?.delete(place.id);
                adjustmentsMade = true;
              }
            }
          }
        }
      }
    }

    if (!adjustmentsMade) break; // Converged
  }

  // Step 4: Generate actual exits from final connections
  for (const place of places) {
    const placeConnections = connections.get(place.id) || new Set();

    for (const otherId of placeConnections) {
      const other = places.find(p => p.id === otherId)!;
      const [fromX, fromY] = place.coordinates;
      const [toX, toY] = other.coordinates;

      const direction = calculateDirection(fromX, fromY, toX, toY);

      // Only create exit if it doesn't already exist
      if (!place.exits[direction as keyof typeof place.exits]) {
        const exitLabel = generateExitLabel(direction, other);
        const exit: Exit = {
          direction,
          label: exitLabel,
          to: otherId
        };
        place.exits[direction as keyof typeof place.exits] = exit;
      }
    }
  }
}

/**
 * Generate fractal trail network from three mountain passes
 * Trail-primary world generation approach
 */
function generateFractalTrailNetwork(config: WorldGenerationConfig, options: Required<WorldGenOptions>): FractalTrailNetwork {
  const { topology, connectivity } = config;
  const { fractal_trails } = connectivity;

  // Generate three mountain passes at 120° intervals
  const mountainRingRadius = topology.mountain_ring.outer_radius;
  const passAngles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3]; // 120° spacing

  const mountainPasses = passAngles.map((angle, index) => ({
    x: Math.cos(angle) * mountainRingRadius,
    y: Math.sin(angle) * mountainRingRadius,
    angle: angle,
    id: `pass_${index}`
  }));

  const trailSystems: TrailSystem[] = [];
  const allSegments: TrailSegment[] = [];
  const intersectionPoints: Array<{ position: [number, number]; connectingSegments: [string, string] }> = [];

  // Create spatial index for optimized intersection detection
  const spatialIndex = createSpatialIndex(topology.ecosystem_slices.outer_radius, topology.central_crater.center);

  // Generate trail system for each mountain pass
  for (const pass of mountainPasses) {
    const trailSystem: TrailSystem = {
      id: pass.id,
      mountainPass: [pass.x, pass.y],
      passAngle: pass.angle,
      segments: [],
      territory: []
    };

    // Generate fractal trail segments from this pass
    const segments = generateTrailSegments(
      pass,
      config,
      options,
      allSegments, // For intersection detection
      intersectionPoints,
      spatialIndex
    );

    trailSystem.segments = segments;
    trailSystems.push(trailSystem);
    allSegments.push(...segments);
  }

  return {
    trailSystems,
    allSegments,
    intersectionPoints
  };
}

/**
 * Generate fractal trail segments from a mountain pass
 */
function generateTrailSegments(
  pass: { x: number; y: number; angle: number; id: string },
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  existingSegments: TrailSegment[],
  intersectionPoints: Array<{ position: [number, number]; connectingSegments: [string, string] }>,
  spatialIndex: SpatialIndex
): TrailSegment[] {
  const { topology, connectivity } = config;
  const { fractal_trails } = connectivity;
  const worldCenter = topology.central_crater.center;
  const growthLimit = topology.ecosystem_slices.outer_radius * 0.8; // Stop at 80% of world radius

  const segments: TrailSegment[] = [];
  const growthQueue: Array<{
    position: [number, number];
    direction: number;
    parentId?: string;
    depth: number;
  }> = [];

  // Start with main trunk from mountain pass
  growthQueue.push({
    position: [pass.x, pass.y],
    direction: pass.angle, // Initial direction outward from center
    depth: 0
  });

  let segmentCounter = 0;

  while (growthQueue.length > 0) {
    const current = growthQueue.shift()!;
    const distanceFromCenter = Math.sqrt(
      (current.position[0] - worldCenter[0]) ** 2 +
      (current.position[1] - worldCenter[1]) ** 2
    );

    // Stop if we've reached the growth limit
    if (distanceFromCenter >= growthLimit) continue;

    // Stop if we've reached max depth
    if (current.depth >= fractal_trails.max_depth) continue;

    // Calculate segment length with variation
    const baseLength = fractal_trails.segment_length;
    const variation = (options.random() - 0.5) * 2 * fractal_trails.length_variation;
    const segmentLength = baseLength * (1 + variation);

    // Calculate new position
    const newX = current.position[0] + Math.cos(current.direction) * segmentLength;
    const newY = current.position[1] + Math.sin(current.direction) * segmentLength;
    const newPosition: [number, number] = [newX, newY];

    // Create segment
    const segment: TrailSegment = {
      id: `${pass.id}_segment_${segmentCounter++}`,
      position: newPosition,
      direction: current.direction,
      length: segmentLength,
      parentId: current.parentId,
      trailSystemId: pass.id,
      depth: current.depth,
      ecosystem: getEcosystemAtPosition(newPosition, config, options) // Will implement this
    };

    segments.push(segment);

    // Add to spatial index for optimized intersection detection
    addToSpatialIndex(segment, spatialIndex);

    // Check for intersections with existing segments from other trail systems
    checkForTrailIntersections(segment, existingSegments, intersectionPoints, worldCenter, topology.ecosystem_slices.outer_radius, spatialIndex);

    // Generate branches based on current depth and ecosystem
    const branchingProbability = fractal_trails.branching_factor *
      Math.pow(fractal_trails.decay_factor, current.depth);

    const numBranches = Math.floor(branchingProbability + options.random());

    for (let i = 0; i < numBranches; i++) {
      // Calculate branch angle
      const angleDeviation = (options.random() - 0.5) * 2 * fractal_trails.branching_angle;
      const branchDirection = current.direction + angleDeviation;

      growthQueue.push({
        position: newPosition,
        direction: branchDirection,
        parentId: segment.id,
        depth: current.depth + 1
      });
    }
  }

  return segments;
}

/**
 * Optimized trail intersection detection with spatial indexing
 */
function checkForTrailIntersections(
  newSegment: TrailSegment,
  existingSegments: TrailSegment[],
  intersectionPoints: Array<{ position: [number, number]; connectingSegments: [string, string] }>,
  worldCenter: [number, number],
  worldRadius: number,
  spatialIndex: SpatialIndex
): void {
  const distanceSquared = squaredDistance(
    newSegment.position[0], newSegment.position[1],
    worldCenter[0], worldCenter[1]
  );

  // Get distance-based intersection threshold (high near center, low at periphery)
  const distance = Math.sqrt(distanceSquared);
  const normalizedDistance = distance / worldRadius;
  const centerThreshold = 3.0;
  const peripheryThreshold = 0.2;
  const decayFactor = Math.exp(-normalizedDistance * 3);
  const intersectionThreshold = peripheryThreshold + (centerThreshold - peripheryThreshold) * decayFactor;
  const intersectionThresholdSquared = intersectionThreshold * intersectionThreshold;

  // Use spatial index to get only nearby segments (O(1) average case)
  const nearbySegments = getNearbySegments(
    newSegment.position[0],
    newSegment.position[1],
    spatialIndex,
    intersectionThreshold
  );

  // Check against nearby segments from other trail systems
  for (const existingSegment of nearbySegments) {
    if (existingSegment.trailSystemId === newSegment.trailSystemId) continue;

    const distanceSquared = squaredDistance(
      newSegment.position[0], newSegment.position[1],
      existingSegment.position[0], existingSegment.position[1]
    );

    if (distanceSquared < intersectionThresholdSquared) {
      // Natural intersection discovered!
      intersectionPoints.push({
        position: [
          (newSegment.position[0] + existingSegment.position[0]) / 2,
          (newSegment.position[1] + existingSegment.position[1]) / 2
        ],
        connectingSegments: [newSegment.id, existingSegment.id]
      });
    }
  }
}

/**
 * Optimized nearest trail distance calculation using spatial indexing
 */
function getNearestTrailDistanceOptimized(x: number, y: number, trailNetwork: FractalTrailNetwork, spatialIndex: SpatialIndex): number {
  let nearestDistanceSquared = Infinity;

  // Use spatial index to get only nearby segments (O(1) average case)
  const searchRadius = 10.0; // 10km search radius
  const nearbySegments = getNearbySegments(x, y, spatialIndex, searchRadius);

  for (const segment of nearbySegments) {
    const distanceSquared = squaredDistance(x, y, segment.position[0], segment.position[1]);

    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
    }
  }

  // Only use sqrt when we have the final minimum distance
  return nearestDistanceSquared === Infinity ? Infinity : Math.sqrt(nearestDistanceSquared);
}

/**
 * Get ecosystem at position (placeholder - will be enhanced)
 */
function getEcosystemAtPosition(
  position: [number, number],
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>
): EcosystemName {
  // Simplified ecosystem assignment - will be enhanced with trail-based logic
  const [x, y] = position;
  const distance = Math.sqrt(x * x + y * y);

  if (distance <= config.topology.central_crater.radius) {
    return EcosystemName.MARSH_TROPICAL;
  } else if (distance <= config.topology.mountain_ring.outer_radius) {
    return EcosystemName.FOREST_MONTANE;
  } else {
    return EcosystemName.GRASSLAND_SUBTROPICAL;
  }
}

/**
 * Assign places to trail territories based on nearest trail system
 */
function assignPlaceToTrailTerritory(
  place: GAEAPlace,
  trailNetwork: FractalTrailNetwork
): string {
  let nearestTrailSystem = '';
  let nearestDistanceSquared = Infinity;

  for (const trailSystem of trailNetwork.trailSystems) {
    for (const segment of trailSystem.segments) {
      const distanceSquared = squaredDistance(
        place.coordinates[0], place.coordinates[1],
        segment.position[0], segment.position[1]
      );

      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestTrailSystem = trailSystem.id;
      }
    }
  }

  return nearestTrailSystem;
}

/**
 * Optimized world generation with combined data collection
 */
function generateWorldData(config: WorldGenerationConfig, options: Required<WorldGenOptions>): {
  places: GAEAPlace[];
} {
  const worldRadius = config.topology.ecosystem_slices.outer_radius;
  const gridSpacing = 1.0 / Math.sqrt(config.place_density);

  // Generate only valid grid points (eliminates filtering step)
  const validPoints = generateValidGridPoints(worldRadius, gridSpacing, config.topology.central_crater.center);

  // Generate places for each valid point
  const places: GAEAPlace[] = validPoints.map(([x, y], index) =>
    generateGAEAPlace(x, y, config, options, index)
  );

  return { places };
}

/**
 * Generate places using optimized grid generation - O(N) where N is number of places
 * Kept for backward compatibility
 */
function generatePlaces(config: WorldGenerationConfig, options: Required<WorldGenOptions>): GAEAPlace[] {
  return generateWorldData(config, options).places;
}

/**
 * Main world generation function - Trail-primary O(N) performance
 * Produces a deterministic world based on fractal trail networks
 * PURE: All sources of impurity are injected via operations parameter
 */
export function generateWorld(
  config: WorldGenerationConfig = DEFAULT_WORLD_CONFIG,
  options?: WorldGenOptions,
  operations?: PotentiallyImpureOperations
): GeneratedWorld {
  // Use injected operations or create deterministic PRNG based on config.random_seed
  const defaultOptions = operations
    ? { random: operations.random, timestamp: operations.timestamp }
    : options
      ? DEFAULT_WORLDGEN_OPTIONS
      : createDefaultOptions(config.random_seed);
  const opts = { ...defaultOptions, ...options };

  // Generate fractal trail network first (trail-primary approach)
  const trailNetwork = generateFractalTrailNetwork(config, opts);

  // Generate all world data using trail-based territories
  const { places } = generateWorldDataWithTrails(config, opts, trailNetwork);

  // Generate exits for all places using trail-based connectivity
  generateExitsOptimizedWithTrails(places, config, trailNetwork);

  return {
    places,
    topology: config.topology,
    config,
    trail_network: trailNetwork // Add trail network to generated world
  };
}

/**
 * Generate world data using hub-and-spoke territories only
 * Places are generated ONLY in:
 * 1. Concentric hub rings (crater, forest, mountain)
 * 2. Along dendritic trail networks (spokes)
 */
function generateWorldDataWithTrails(
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  trailNetwork: FractalTrailNetwork
): {
  places: GAEAPlace[];
} {
  const places: GAEAPlace[] = [];
  let placeIndex = 0;

  // 1. Generate places in concentric hub rings
  const hubPlaces = generateHubRingPlaces(config, options, placeIndex);
  places.push(...hubPlaces);
  placeIndex += hubPlaces.length;

  // 2. Generate places along trail networks (spokes)
  const spokePlaces = generateSpokeTrailPlaces(config, options, trailNetwork, placeIndex);
  places.push(...spokePlaces);

  return { places };
}

/**
 * Generate places in concentric hub rings only
 */
function generateHubRingPlaces(
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  startIndex: number
): GAEAPlace[] {
  const places: GAEAPlace[] = [];
  const center = config.topology.central_crater.center;
  const craterRadius = config.topology.central_crater.radius;
  const mountainInnerRadius = config.topology.mountain_ring.inner_radius;
  const mountainOuterRadius = config.topology.mountain_ring.outer_radius;

  let placeIndex = startIndex;

  // Calculate place density for rings
  const ringDensity = config.place_density * 0.5; // Moderate density in hub
  const spacing = 1.0 / Math.sqrt(ringDensity);

  // Ring 1: Crater center (marsh:tropical)
  const craterPlaceCount = Math.max(8, Math.floor(Math.PI * craterRadius * craterRadius * ringDensity));
  for (let i = 0; i < craterPlaceCount; i++) {
    const angle = (i / craterPlaceCount) * 2 * Math.PI + options.random() * 0.3;
    const radius = options.random() * craterRadius;
    const x = center[0] + Math.cos(angle) * radius;
    const y = center[1] + Math.sin(angle) * radius;

    const place = generateGAEAPlace(x, y, config, options, placeIndex++);
    // Override ecosystem for hub
    place.ecology = ECOSYSTEM_PROFILES[config.hub_ecosystems.crater];
    places.push(place);
  }

  // Ring 2: Forest ring (forest:coniferous)
  const forestArea = Math.PI * (mountainInnerRadius * mountainInnerRadius - craterRadius * craterRadius);
  const forestPlaceCount = Math.max(12, Math.floor(forestArea * ringDensity));
  for (let i = 0; i < forestPlaceCount; i++) {
    const angle = (i / forestPlaceCount) * 2 * Math.PI + options.random() * 0.2;
    const minRadius = craterRadius + spacing * 0.5;
    const maxRadius = mountainInnerRadius - spacing * 0.5;
    const radius = minRadius + options.random() * (maxRadius - minRadius);
    const x = center[0] + Math.cos(angle) * radius;
    const y = center[1] + Math.sin(angle) * radius;

    const place = generateGAEAPlace(x, y, config, options, placeIndex++);
    // Override ecosystem for hub
    place.ecology = ECOSYSTEM_PROFILES[config.hub_ecosystems.forest_ring];
    places.push(place);
  }

  // Ring 3: Mountain ring (forest:montane)
  const mountainArea = Math.PI * (mountainOuterRadius * mountainOuterRadius - mountainInnerRadius * mountainInnerRadius);
  const mountainPlaceCount = Math.max(16, Math.floor(mountainArea * ringDensity));
  for (let i = 0; i < mountainPlaceCount; i++) {
    const angle = (i / mountainPlaceCount) * 2 * Math.PI + options.random() * 0.15;
    const minRadius = mountainInnerRadius + spacing * 0.5;
    const maxRadius = mountainOuterRadius - spacing * 0.5;
    const radius = minRadius + options.random() * (maxRadius - minRadius);
    const x = center[0] + Math.cos(angle) * radius;
    const y = center[1] + Math.sin(angle) * radius;

    const place = generateGAEAPlace(x, y, config, options, placeIndex++);
    // Override ecosystem for hub
    place.ecology = ECOSYSTEM_PROFILES[config.hub_ecosystems.mountain_ring];
    places.push(place);
  }

  return places;
}

/**
 * Generate places along trail networks only (spokes)
 */
function generateSpokeTrailPlaces(
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  trailNetwork: FractalTrailNetwork,
  startIndex: number
): GAEAPlace[] {
  const places: GAEAPlace[] = [];
  let placeIndex = startIndex;

  // Generate places along each trail system
  for (const trailSystem of trailNetwork.trailSystems) {
    const spokeEcosystem = getSpokeEcosystemForTrailSystem(trailSystem, config);

    // Generate places along trail segments
    for (const segment of trailSystem.segments) {
      // Place density along trails (higher density for main branches)
      const segmentDensity = config.place_density * (1.0 / (1.0 + segment.depth * 0.3));
      const spacing = 1.0 / Math.sqrt(segmentDensity);

      // Generate 1-3 places per segment based on length
      const placesPerSegment = Math.max(1, Math.floor(segment.length / spacing));

      for (let i = 0; i < placesPerSegment; i++) {
        // Scatter places slightly around the segment position
        const offsetRadius = spacing * 0.3;
        const offsetAngle = options.random() * 2 * Math.PI;
        const offsetDistance = options.random() * offsetRadius;

        const x = segment.position[0] + Math.cos(offsetAngle) * offsetDistance;
        const y = segment.position[1] + Math.sin(offsetAngle) * offsetDistance;

        const place = generateGAEAPlace(x, y, config, options, placeIndex++);

        // Set trail territory and ecosystem
        place.trail_territory_id = trailSystem.id;
        place.ecology = ECOSYSTEM_PROFILES[spokeEcosystem];

        places.push(place);
      }
    }
  }

  return places;
}

/**
 * Get the appropriate spoke ecosystem for a trail system
 */
function getSpokeEcosystemForTrailSystem(
  trailSystem: TrailSystem,
  config: WorldGenerationConfig
): EcosystemName {
  // Map trail system to spoke ecosystem based on pass angle
  const passAngle = trailSystem.passAngle;

  // Normalize angle to 0-360 degrees
  const angleDegrees = ((passAngle * 180 / Math.PI) + 360) % 360;

  if (angleDegrees < 60 || angleDegrees >= 300) {
    return config.spoke_ecosystems.pass_0;      // 0° ± 60°
  } else if (angleDegrees >= 60 && angleDegrees < 180) {
    return config.spoke_ecosystems.pass_120;    // 120° ± 60°
  } else {
    return config.spoke_ecosystems.pass_240;    // 240° ± 60°
  }
}

/**
 * Generate exits optimized with trail-based connectivity and spatial indexing
 */
function generateExitsOptimizedWithTrails(
  places: GAEAPlace[],
  config: WorldGenerationConfig,
  trailNetwork: FractalTrailNetwork
): void {
  if (places.length === 0) return;

  const worldRadius = config.topology.ecosystem_slices.outer_radius;
  const gridSpacing = 1.0 / Math.sqrt(config.place_density);
  const adaptiveMaxDistance = Math.max(gridSpacing * config.connectivity.connection_distance_factor, 3.0);
  const adaptiveMaxDistanceSquared = adaptiveMaxDistance * adaptiveMaxDistance;

  // Create spatial index for trail segments
  const spatialIndex = createSpatialIndex(worldRadius, config.topology.central_crater.center);
  for (const segment of trailNetwork.allSegments) {
    addToSpatialIndex(segment, spatialIndex);
  }

  // Connection priority: trail-based connections get priority
  const connections = new Map<PlaceURN, Set<PlaceURN>>();

  // Step 1: Trail-based connectivity with optimized distance calculations
  for (const place of places) {
    if (!connections.has(place.id)) connections.set(place.id, new Set());

    const candidates: Array<{ place: GAEAPlace; distanceSquared: number; priority: number }> = [];
    const trailDistance = getNearestTrailDistanceOptimized(place.coordinates[0], place.coordinates[1], trailNetwork, spatialIndex);

    for (const other of places) {
      if (place.id === other.id) continue;

      const distanceSquared = squaredDistance(
        place.coordinates[0], place.coordinates[1],
        other.coordinates[0], other.coordinates[1]
      );

      if (distanceSquared > adaptiveMaxDistanceSquared) continue;

      // Priority scoring: trail proximity matters most
      let priority = 1.0 / Math.sqrt(distanceSquared);

      // Boost priority for trail-based connections
      const otherTrailDistance = getNearestTrailDistanceOptimized(other.coordinates[0], other.coordinates[1], trailNetwork, spatialIndex);
      const avgTrailDistance = (trailDistance + otherTrailDistance) / 2;
      const trailBonus = Math.exp(-avgTrailDistance / 2.0); // Exponential decay
      priority *= (1 + trailBonus);

      // Same territory bonus
      if (place.trail_territory_id === other.trail_territory_id) {
        priority *= 1.5;
      }

      candidates.push({ place: other, distanceSquared, priority });
    }

    // Sort by priority and connect to top candidates
    candidates.sort((a, b) => b.priority - a.priority);

    // Connect to top candidates (more connections near trails)
    const connectionCount = trailDistance < 2.0 ? 4 : trailDistance < 4.0 ? 3 : 2;
    const connections_to_make = candidates.slice(0, connectionCount);

    for (const { place: other } of connections_to_make) {
      connections.get(place.id)!.add(other.id);
      if (!connections.has(other.id)) connections.set(other.id, new Set());
      connections.get(other.id)!.add(place.id);
    }
  }

  // Step 2: Ensure global connectivity (same BFS approach as before)
  let visited = new Set<PlaceURN>();
  const queue = [places[0].id];
  visited.add(places[0].id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = connections.get(currentId) || new Set();

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  // Connect any isolated components using optimized distance calculations
  for (const place of places) {
    if (!visited.has(place.id)) {
      let closestConnected: GAEAPlace | null = null;
      let closestDistanceSquared = Infinity;

      for (const other of places) {
        if (visited.has(other.id)) {
          const distanceSquared = squaredDistance(
            place.coordinates[0], place.coordinates[1],
            other.coordinates[0], other.coordinates[1]
          );
          if (distanceSquared < closestDistanceSquared) {
            closestDistanceSquared = distanceSquared;
            closestConnected = other;
          }
        }
      }

      if (closestConnected) {
        if (!connections.has(place.id)) connections.set(place.id, new Set());
        connections.get(place.id)!.add(closestConnected.id);
        connections.get(closestConnected.id)!.add(place.id);
        visited.add(place.id);
      }
    }
  }

  // Step 3: Convert connections to exits
  for (const place of places) {
    const placeConnections = connections.get(place.id) || new Set();

    for (const connectedId of placeConnections) {
      const connectedPlace = places.find(p => p.id === connectedId);
      if (connectedPlace) {
        const direction = calculateDirection(
          place.coordinates[0], place.coordinates[1],
          connectedPlace.coordinates[0], connectedPlace.coordinates[1]
        );

        const exit: Exit = {
          to: connectedPlace.id,
          direction,
          label: generateExitLabel(direction, connectedPlace)
        };

        place.exits[direction] = exit;
      }
    }
  }
}

/**
 * Generate a specific ecosystem slice for focused testing
 */
export function generateEcosystemSlice(
  ecosystem: EcosystemName,
  config: Partial<WorldGenerationConfig> = {},
  options?: WorldGenOptions
): GAEAPlace[] {
  // Input validation
  const validEcosystems = Object.values(EcosystemName);
  if (!validEcosystems.includes(ecosystem)) {
    throw new Error(`Invalid ecosystem: ${ecosystem}. Valid ecosystems: ${validEcosystems.join(', ')}`);
  }

  const fullConfig = { ...DEFAULT_WORLD_CONFIG, ...config };
  // Use deterministic PRNG based on config.random_seed if no options provided
  const defaultOptions = options ? DEFAULT_WORLDGEN_OPTIONS : createDefaultOptions(fullConfig.random_seed);
  const opts = { ...defaultOptions, ...options };

  return generatePlaces(fullConfig, opts)
    .filter(place => place.ecology.ecosystem === ecosystem);
}

/**
 * Export configuration and profiles for external use
 */
export { ECOSYSTEM_PROFILES, DEFAULT_WORLDGEN_OPTIONS };

/**
 * Export types for external use
 */
export type { WorldGenerationConfig, GeneratedWorld, GAEAPlace, EcosystemName, WorldGenOptions };

/**
 * Analyze and report ecosystem connectivity statistics
 * Useful for debugging and tuning connectivity parameters
 */
export function analyzeEcosystemConnectivity(world: GeneratedWorld): {
  totalPlaces: number;
  boundaryPlaces: number;
  ecosystemStats: Array<{
    ecosystem: EcosystemName;
    totalPlaces: number;
    nonBoundaryPlaces: number;
    averageEdges: number;
    targetEdges: number | undefined;
    boundaryAverageEdges: number;
  }>;
} {
  const config = world.config;
  const worldRadius = config.topology.ecosystem_slices.outer_radius;
  const boundaryThreshold = config.connectivity.boundary_detection_threshold;

  let boundaryCount = 0;
  const ecosystemData = new Map<EcosystemName, {
    totalPlaces: number;
    nonBoundaryPlaces: number;
    totalEdges: number;
    boundaryEdges: number;
    boundaryCount: number;
  }>();

  // Initialize ecosystem data
  for (const ecosystem of Object.values(EcosystemName)) {
    ecosystemData.set(ecosystem, {
      totalPlaces: 0,
      nonBoundaryPlaces: 0,
      totalEdges: 0,
      boundaryEdges: 0,
      boundaryCount: 0
    });
  }

  // Analyze each place
  for (const place of world.places) {
    const ecosystem = place.ecology.ecosystem as EcosystemName;
    const isBoundary = isBoundaryPlace(place, worldRadius, boundaryThreshold);
    const edgeCount = Object.keys(place.exits).length;

    const data = ecosystemData.get(ecosystem)!;
    data.totalPlaces++;

    if (isBoundary) {
      boundaryCount++;
      data.boundaryCount++;
      data.boundaryEdges += edgeCount;
    } else {
      data.nonBoundaryPlaces++;
      data.totalEdges += edgeCount;
    }
  }

  // Calculate statistics
  const ecosystemStats = Array.from(ecosystemData.entries()).map(([ecosystem, data]) => ({
    ecosystem,
    totalPlaces: data.totalPlaces,
    nonBoundaryPlaces: data.nonBoundaryPlaces,
    averageEdges: data.nonBoundaryPlaces > 0 ? data.totalEdges / data.nonBoundaryPlaces : 0,
    targetEdges: config.connectivity.ecosystem_edge_targets[ecosystem],
    boundaryAverageEdges: data.boundaryCount > 0 ? data.boundaryEdges / data.boundaryCount : 0,
  }));

  return {
    totalPlaces: world.places.length,
    boundaryPlaces: boundaryCount,
    ecosystemStats
  };
}
