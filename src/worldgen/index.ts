/**
 * Pure, deterministic world generation library
 * Implements hub-and-spoke topology with G.A.E.A. ecosystem management
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - O(N) time complexity where N = number of places generated
 * - Precomputed ecosystem distribution caches with O(1) lookups
 * - Efficient circular grid generation (no wasted square→circle filtering)
 * - Binary search for weighted ecosystem selection: O(log k) where k = 5 ecosystems
 * - Single-pass data collection (places, infection zones, worshipper territories)
 * - Pre-allocated arrays to avoid dynamic resizing
 * - Cached habitat key lookups to avoid repeated string operations
 *
 * MEMORY TRADE-OFFS:
 * - Uses Map caches for ecosystem distribution and habitat keys
 * - Pre-allocates arrays based on calculated grid size
 * - Trades memory for consistent O(N) performance
 */

import { Place, PlaceURN, EntityType } from '~/types/index';
import { Weather } from '~/types/entity/place';
import {
  WorldGenerationConfig,
  GeneratedWorld,
  GAEAPlace,
  EcosystemName,
  ECOSYSTEM_PROFILES,
  GAEA_MANAGEMENT_PROFILES,
  CORDYCEPS_HABITAT_ZONES,
  WORSHIPPER_BEHAVIOR_PROFILES,
  WorldTopology,
  WorldGenOptions
} from './types';

/**
 * Precomputed ecosystem data for O(1) lookups
 */
type EcosystemCache = {
  ecosystems: EcosystemName[];
  weights: number[];
  cumulativeWeights: number[];
  mountainEcosystems: EcosystemName[];
  totalWeight: number;
};

/**
 * Cache for frequently used computations
 */
const ecosystemCache = new Map<string, EcosystemCache>();
const habitatKeyCache = new Map<string, keyof typeof CORDYCEPS_HABITAT_ZONES>();

/**
 * Precompute ecosystem distribution data for efficient lookups
 */
function getEcosystemCache(config: WorldGenerationConfig): EcosystemCache {
  const cacheKey = JSON.stringify(config.ecosystem_distribution);

  if (ecosystemCache.has(cacheKey)) {
    return ecosystemCache.get(cacheKey)!;
  }

  const ecosystems = Object.keys(config.ecosystem_distribution) as EcosystemName[];
  const weights = Object.values(config.ecosystem_distribution);
  const cumulativeWeights: number[] = [];
  const mountainEcosystems = ecosystems.filter(e => e.includes('mountain'));

  let totalWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    totalWeight += weights[i];
    cumulativeWeights[i] = totalWeight;
  }

  const cache: EcosystemCache = {
    ecosystems,
    weights,
    cumulativeWeights,
    mountainEcosystems,
    totalWeight
  };

  ecosystemCache.set(cacheKey, cache);
  return cache;
}

/**
 * Efficient binary search for weighted ecosystem selection
 */
function selectEcosystemByWeight(target: number, cache: EcosystemCache): EcosystemName {
  const { ecosystems, cumulativeWeights } = cache;

  // Binary search for O(log k) where k is number of ecosystems (small constant)
  let left = 0;
  let right = cumulativeWeights.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (target <= cumulativeWeights[mid]) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }

  return ecosystems[left];
}

/**
 * Cached habitat key determination
 */
function getHabitatKey(zone: GAEAPlace['topology_zone'], ecosystem: EcosystemName): keyof typeof CORDYCEPS_HABITAT_ZONES {
  const cacheKey = `${zone}-${ecosystem}`;

  if (habitatKeyCache.has(cacheKey)) {
    return habitatKeyCache.get(cacheKey)!;
  }

  const habitatKey = zone === 'mountain_ring' && ecosystem === EcosystemName.MOUNTAIN_FOREST
    ? 'mountain_forest'
    : ecosystem === EcosystemName.FOREST_TEMPERATE
      ? 'forest_understory'
      : 'grassland_riparian';

  habitatKeyCache.set(cacheKey, habitatKey);
  return habitatKey;
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
 * Implements the hub-and-spoke design with G.A.E.A. management
 */
export const DEFAULT_WORLD_CONFIG: WorldGenerationConfig = {
  topology: {
    central_plateau: {
      center: [0, 0],
      radius: 6.4,                    // 6.4km radius (San Francisco-sized)
      elevation: 2000                 // 2000m elevation
    },
    mountain_ring: {
      inner_radius: 6.4,              // Plateau boundary
      outer_radius: 10.2,             // Mountain ring boundary
      elevation_range: [2500, 4000]   // Mountain heights
    },
    ecosystem_slices: {
      slice_count: 3,                 // Launch configuration: 3 slices
      outer_radius: 25.6,             // World boundary (25.6km radius)
      elevation_range: [500, 1500]    // Peripheral elevations
    }
  },
  ecosystem_distribution: {
    [EcosystemName.FOREST_TEMPERATE]: 0.40,        // 40% - Prime cordyceps habitat
    [EcosystemName.GRASSLAND_TEMPERATE]: 0.30,     // 30% - Moderate G.A.E.A. control
    [EcosystemName.GRASSLAND_ARID]: 0.05,          // 5% - Minimal G.A.E.A. oversight
    [EcosystemName.MOUNTAIN_ALPINE]: 0.15,         // 15% - Strategic high-altitude control
    [EcosystemName.MOUNTAIN_FOREST]: 0.10          // 10% - Maximum fungal cultivation
  },
  gaea_intensity: 0.8,                // High G.A.E.A. management intensity
  fungal_spread_factor: 0.6,          // Moderate infection risk base
  worshipper_density: 0.3,            // 30% of places have worshipper presence
  place_density: 4.0,                 // 4 places per square km
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
  if (distance <= topology.central_plateau.radius) {
    return 'plateau';
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
 * Determine ecosystem type based on topology zone and slice
 * Uses precomputed cache for O(1) or O(log k) performance
 */
function getEcosystemType(
  zone: GAEAPlace['topology_zone'],
  sliceId: number,
  config: WorldGenerationConfig,
  options: Required<WorldGenOptions>,
  cache: EcosystemCache
): EcosystemName {
  // Central plateau: Always mountain alpine (G.A.E.A. sanctuary)
  if (zone === 'plateau') {
    return EcosystemName.MOUNTAIN_ALPINE;
  }

  // Mountain ring: Mix of mountain types with randomness
  if (zone === 'mountain_ring') {
    return randomChoice(options.random, cache.mountainEcosystems);
  }

  // Ecosystem slices: Weighted random selection with slice-based variation
  if (zone === 'ecosystem_slice') {
    // Use multiple random calls to ensure better seed variation
    const baseRand1 = options.random();
    const baseRand2 = options.random();
    const baseRand3 = options.random();

    // Better mixing of slice ID and randomness
    const sliceInfluence = sliceId / cache.ecosystems.length;
    const randomInfluence = (baseRand1 + baseRand2 * 0.5 + baseRand3 * 0.25) / 1.75;
    const sliceOffset = (sliceInfluence * 0.3 + randomInfluence * 0.7) % 1.0;

    // Use efficient binary search for weighted selection
    return selectEcosystemByWeight(sliceOffset * cache.totalWeight, cache);
  }

  // Periphery: Grassland (minimal G.A.E.A. oversight)
  return EcosystemName.GRASSLAND_TEMPERATE;
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
  cache: EcosystemCache,
  index: number
): GAEAPlace {
  const distance = calculateDistanceFromCenter(x, y, config.topology.central_plateau.center);
  const zone = getTopologyZone(distance, config.topology);
  const sliceId = calculateEcosystemSlice(x, y, config.topology.central_plateau.center, config.topology.ecosystem_slices.slice_count);

  const ecosystem = getEcosystemType(zone, sliceId, config, options, cache);
  const weather = generateInitialWeather(ecosystem, options);

  const placeUrn: PlaceURN = `flux:place:world:generated:${index}`;

  // Base place properties
  const basePlace: Place = {
    id: placeUrn,
    type: EntityType.PLACE,
    name: `${ecosystem.split(':')[2]} ${index}`,
    description: `A ${ecosystem.split(':')[2]} area managed by G.A.E.A.`,
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

  // G.A.E.A. management properties (O(1) lookup)
  const gaeaManagement = GAEA_MANAGEMENT_PROFILES[ecosystem];

  // Cordyceps habitat determination (cached)
  const habitatKey = getHabitatKey(zone, ecosystem);
  const cordycepsHabitat = {
    shade: CORDYCEPS_HABITAT_ZONES[habitatKey].shade_level,
    humidity: CORDYCEPS_HABITAT_ZONES[habitatKey].humidity,
    detritus: CORDYCEPS_HABITAT_ZONES[habitatKey].organic_matter,
    infection_risk: CORDYCEPS_HABITAT_ZONES[habitatKey].infection_risk,
    gaea_cultivation: CORDYCEPS_HABITAT_ZONES[habitatKey].gaea_cultivation
  };

  // Worshipper behavior based on zone and infection risk
  const worshipperBehaviorKey = distance <= config.topology.mountain_ring.outer_radius / 2
    ? 'gaea_agents'
    : distance <= config.topology.mountain_ring.outer_radius
      ? 'established_worshippers'
      : 'newly_infected';

  const worshipperBehavior = WORSHIPPER_BEHAVIOR_PROFILES[worshipperBehaviorKey];

  const place: GAEAPlace = {
    ...basePlace,
    gaea_management: gaeaManagement,
    cordyceps_habitat: cordycepsHabitat,
    worshipper_behavior: worshipperBehavior,
    topology_zone: zone,
    distance_from_center: distance / config.topology.ecosystem_slices.outer_radius,
    ecosystem_slice_id: zone === 'ecosystem_slice' ? sliceId : undefined
  };

  return place;
}

/**
 * Clear performance caches (useful for testing or memory management)
 */
export function clearWorldGenCaches(): void {
  ecosystemCache.clear();
  habitatKeyCache.clear();
}

/**
 * Optimized world generation with combined data collection
 */
function generateWorldData(config: WorldGenerationConfig, options: Required<WorldGenOptions>): {
  places: GAEAPlace[];
  infectionZones: GeneratedWorld['infection_zones'];
  worshipperTerritories: GeneratedWorld['worshipper_territories'];
} {
  const worldRadius = config.topology.ecosystem_slices.outer_radius;
  const gridSpacing = 1.0 / Math.sqrt(config.place_density);

  // Precompute ecosystem cache once
  const cache = getEcosystemCache(config);

  // Generate only valid grid points (eliminates filtering step)
  const validPoints = generateValidGridPoints(worldRadius, gridSpacing, config.topology.central_plateau.center);

  // Pre-allocate arrays for better performance
  const places: GAEAPlace[] = new Array(validPoints.length);
  const infectionZones: GeneratedWorld['infection_zones'] = [];
  const worshipperTerritories: GeneratedWorld['worshipper_territories'] = [];

  // Generate places and collect infection/worshipper data in single pass
  for (let i = 0; i < validPoints.length; i++) {
    const [x, y] = validPoints[i];
    const place = generateGAEAPlace(x, y, config, options, cache, i);
    places[i] = place;

    // Collect infection zones data inline (avoid separate O(N) filter)
    if (place.cordyceps_habitat.infection_risk > 0.1) {
      const habitatType = place.cordyceps_habitat.gaea_cultivation
        ? 'mountain_forest'
        : place.topology_zone === 'mountain_ring'
          ? 'mountain_caves'
          : 'forest_understory';

      infectionZones.push({
        place_id: place.id,
        infection_risk: place.cordyceps_habitat.infection_risk,
        habitat_type: habitatType as keyof typeof CORDYCEPS_HABITAT_ZONES
      });
    }

    // Collect worshipper territories data inline (avoid separate O(N) filter)
    if (place.gaea_management.worshipper_presence > 0.5) {
      const behaviorKey = place.distance_from_center <= 0.25
        ? 'gaea_agents'
        : place.distance_from_center <= 0.5
          ? 'established_worshippers'
          : 'newly_infected';

      worshipperTerritories.push({
        place_id: place.id,
        territory_control: place.gaea_management.territorial_stability,
        behavior_profile: behaviorKey as keyof typeof WORSHIPPER_BEHAVIOR_PROFILES
      });
    }
  }

  return { places, infectionZones, worshipperTerritories };
}

/**
 * Generate places using optimized grid generation - O(N) where N is number of places
 * Kept for backward compatibility
 */
function generatePlaces(config: WorldGenerationConfig, options: Required<WorldGenOptions>): GAEAPlace[] {
  return generateWorldData(config, options).places;
}

/**
 * Generate infection zones based on cordyceps habitat
 * Optimized version that works with generateWorldData
 */
function generateInfectionZones(places: GAEAPlace[]): GeneratedWorld['infection_zones'] {
  // This is now only used for backward compatibility
  // The optimized path uses generateWorldData
  return places
    .filter(place => place.cordyceps_habitat.infection_risk > 0.1)
    .map(place => {
      const habitatType = place.cordyceps_habitat.gaea_cultivation
        ? 'mountain_forest'
        : place.topology_zone === 'mountain_ring'
          ? 'mountain_caves'
          : 'forest_understory';

      return {
        place_id: place.id,
        infection_risk: place.cordyceps_habitat.infection_risk,
        habitat_type: habitatType as keyof typeof CORDYCEPS_HABITAT_ZONES
      };
    });
}

/**
 * Generate worshipper territories based on infection zones and G.A.E.A. control
 * Optimized version that works with generateWorldData
 */
function generateWorshipperTerritories(places: GAEAPlace[]): GeneratedWorld['worshipper_territories'] {
  // This is now only used for backward compatibility
  // The optimized path uses generateWorldData
  return places
    .filter(place => place.gaea_management.worshipper_presence > 0.5)
    .map(place => {
      const behaviorKey = place.distance_from_center <= 0.25
        ? 'gaea_agents'
        : place.distance_from_center <= 0.5
          ? 'established_worshippers'
          : 'newly_infected';

      return {
        place_id: place.id,
        territory_control: place.gaea_management.territorial_stability,
        behavior_profile: behaviorKey as keyof typeof WORSHIPPER_BEHAVIOR_PROFILES
      };
    });
}

/**
 * Main world generation function - Optimized O(N) performance
 * Produces a deterministic world based on configuration
 */
export function generateWorld(
  config: WorldGenerationConfig = DEFAULT_WORLD_CONFIG,
  options?: WorldGenOptions
): GeneratedWorld {
  // Use deterministic PRNG based on config.random_seed if no options provided
  const defaultOptions = options ? DEFAULT_WORLDGEN_OPTIONS : createDefaultOptions(config.random_seed);
  const opts = { ...defaultOptions, ...options };

  // Generate all world data in a single optimized pass
  const { places, infectionZones, worshipperTerritories } = generateWorldData(config, opts);

  return {
    places,
    topology: config.topology,
    infection_zones: infectionZones,
    worshipper_territories: worshipperTerritories,
    config
  };
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
export { ECOSYSTEM_PROFILES, GAEA_MANAGEMENT_PROFILES, CORDYCEPS_HABITAT_ZONES, DEFAULT_WORLDGEN_OPTIONS };

/**
 * Export types for external use
 */
export type { WorldGenerationConfig, GeneratedWorld, GAEAPlace, EcosystemName, WorldGenOptions };
