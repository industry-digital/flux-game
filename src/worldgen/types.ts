/**
 * Pure, deterministic world generation library types
 * Integrates with existing Place types and weather system
 */

import { Place } from '@flux';
import { EcologicalProfile } from '~/types/entity/place';

// Ecosystem URNs following existing taxonomy system
export enum EcosystemName {
  FOREST_MONTANE = 'flux:eco:forest:montane',
  MOUNTAIN_ALPINE = 'flux:eco:mountain:alpine',
  GRASSLAND_SUBTROPICAL = 'flux:eco:grassland:subtropical',
  WETLAND_TROPICAL = 'flux:eco:wetland:tropical',
  FOREST_CONIFEROUS = 'flux:eco:forest:coniferous',
  MARSH_TROPICAL = 'flux:eco:marsh:tropical',
  RUINS_TROPICAL= 'flux:eco:ruins:tropical',
  ARID_SCRUBLAND = 'flux:eco:scrubland:arid',
  FOREST_TEMPERATE = 'flux:eco:forest:temperate',
}

// Injected dependencies for pure world generation
export type WorldGenOptions = {
  random?: () => number;
  timestamp?: () => number;
};

// Hub-and-spoke crater topology structure
export type WorldTopology = {
  central_crater: {
    center: [number, number];          // World center coordinates
    radius: number;                    // Crater radius in km
    elevation: number;                 // Elevation in meters (negative = below sea level)
  };
  mountain_ring: {
    inner_radius: number;              // Mountain ring inner boundary (crater rim)
    outer_radius: number;              // Mountain ring outer boundary
    elevation_range: [number, number]; // Min/max elevation (crater walls)
  };
  ecosystem_slices: {
    slice_count: number;               // Number of ecosystem slices
    outer_radius: number;              // World boundary
    elevation_range: [number, number]; // Peripheral elevation range
  };
};

// World generation configuration
export type WorldGenerationConfig = {
  topology: WorldTopology;
  place_density: number;              // Places per square km
  connectivity: {
    max_exits_per_place: number;      // Maximum number of exits per place (default: 6)
    connection_distance_factor: number; // Distance multiplier for connections (default: 1.5)
    connection_density: number;       // Overall connectivity density 0-1 (default: 1.0)
    prefer_same_zone: boolean;        // Whether to prefer connections within same topology zone
    ecosystem_edge_targets: {         // Target average edges per ecosystem (excluding boundary nodes)
      [key in EcosystemName]?: number;
    };
    boundary_detection_threshold: number; // Distance from world edge to consider "boundary" (default: 0.05 = 5% of radius)
    fractal_trails: {                 // Fractal trail network configuration
      enabled: boolean;               // Whether to generate fractal trails
      trail_count: number;            // Number of main trails from mountain passes
      branching_factor: number;       // Average number of branches per trail segment (1.5-3.0)
      branching_angle: number;        // Max angle deviation for branches (in radians)
      max_depth: number;              // Maximum trail branching depth
      segment_length: number;         // Base length of trail segments
      length_variation: number;       // Random variation in segment length (0-1)
      trail_width: number;            // Connection radius around trail path
      decay_factor: number;           // How much branching reduces with distance (0-1)
    };
  };
  hub_ecosystems: {                   // Hub ecosystem assignments for concentric rings
    crater: EcosystemName;            // Crater center ecosystem
    forest_ring: EcosystemName;       // Middle forest ring ecosystem
    mountain_ring: EcosystemName;     // Mountain ring ecosystem
  };
  spoke_ecosystems: {                 // Spoke ecosystem assignments for mountain passes
    pass_0: EcosystemName;            // 0° pass ecosystem
    pass_120: EcosystemName;          // 120° pass ecosystem
    pass_240: EcosystemName;          // 240° pass ecosystem
  };
  random_seed: number;                // For deterministic generation
};

// Generated place with topology information
export type GAEAPlace = Place & {
  topology_zone: 'crater' | 'mountain_ring' | 'ecosystem_slice' | 'periphery';
  distance_from_center: number;       // 0.0 (center) to 1.0 (edge)
  ecosystem_slice_id?: number;        // Which ecosystem slice (if applicable)
  coordinates: [number, number];      // Original X,Y coordinates from grid generation
  trail_territory_id?: string;       // Trail territory assignment for fractal trails
};

// World generation result
export type GeneratedWorld = {
  places: GAEAPlace[];
  topology: WorldTopology;
  config: WorldGenerationConfig;
  trail_network?: FractalTrailNetwork;  // Optional fractal trail network
};

// Ecosystem schema definitions
export const ECOSYSTEM_PROFILES: Record<EcosystemName, EcologicalProfile> = {
  [EcosystemName.FOREST_CONIFEROUS]: {
    ecosystem: 'flux:eco:forest:coniferous',
    temperature: [5.0, 22.0],          // Cool coniferous forest (Mesozoic climate)
    pressure: [1000.0, 1020.0],        // Standard atmospheric pressure
    humidity: [60.0, 85.0]             // Moderate humidity (coniferous adaptations)
  },
  [EcosystemName.GRASSLAND_SUBTROPICAL]: {
    ecosystem: 'flux:eco:grassland:subtropical',
    temperature: [18.0, 38.0],         // Warm subtropical grassland (Mesozoic warmth)
    pressure: [1005.0, 1023.0],        // Slightly elevated pressure
    humidity: [50.0, 75.0]             // Higher humidity than modern temperate
  },
  [EcosystemName.WETLAND_TROPICAL]: {
    ecosystem: 'flux:eco:wetland:tropical',
    temperature: [22.0, 36.0],         // Warm tropical wetland (Mesozoic warmth)
    pressure: [1005.0, 1020.0],        // Standard atmospheric pressure
    humidity: [80.0, 100.0]            // Very high humidity (tropical wetland)
  },
  [EcosystemName.FOREST_MONTANE]: {
    ecosystem: 'flux:eco:forest:montane',
    temperature: [-5.0, 18.0],         // Cooler than lowland forest (altitude effect)
    pressure: [900.0, 980.0],          // Low pressure (high altitude)
    humidity: [70.0, 95.0]             // High humidity (forest + orographic precipitation)
  },
  [EcosystemName.MOUNTAIN_ALPINE]: {
    ecosystem: 'flux:eco:mountain:alpine',
    temperature: [-10.0, 15.0],        // Cold alpine conditions (high altitude)
    pressure: [850.0, 920.0],          // Very low pressure (highest altitude)
    humidity: [30.0, 60.0]             // Low humidity (alpine conditions)
  },
  [EcosystemName.MARSH_TROPICAL]: {
    ecosystem: 'flux:eco:marsh:tropical',
    temperature: [18.0, 32.0],         // Warm tropical marsh climate
    pressure: [1020.0, 1040.0],        // Higher pressure (below sea level)
    humidity: [85.0, 100.0]            // Very high humidity (marshland)
  },
  [EcosystemName.RUINS_TROPICAL]: {
    ecosystem: 'flux:eco:ruins:tropical',
    temperature: [18.0, 32.0],         // Warm tropical ruins climate
    pressure: [1020.0, 1040.0],        // Higher pressure (below sea level)
    humidity: [85.0, 100.0]            // Very high humidity (ruins)
  },
  [EcosystemName.ARID_SCRUBLAND]: {
    ecosystem: 'flux:eco:scrubland:arid',
    temperature: [18.0, 32.0],         // Warm tropical scrubland climate
    pressure: [1020.0, 1040.0],        // Higher pressure (below sea level)
    humidity: [85.0, 100.0]            // Very high humidity (scrubland)
  },
  [EcosystemName.FOREST_TEMPERATE]: {
    ecosystem: 'flux:eco:forest:temperate',
    temperature: [12.0, 25.0],         // Temperate forest climate
    pressure: [1000.0, 1020.0],        // Standard atmospheric pressure
    humidity: [65.0, 85.0]             // Moderate to high humidity
  }
};

// Trail system types
export interface TrailSegment {
  id: string;
  position: [number, number];
  direction: number;              // Radians
  length: number;
  parentId?: string;             // For branching hierarchy
  trailSystemId: string;         // Which mountain pass this belongs to
  depth: number;                 // Branching depth (0 = main trunk)
  ecosystem: EcosystemName;      // Ecosystem at this segment
}

export interface TrailSystem {
  id: string;
  mountainPass: [number, number];
  passAngle: number;
  segments: TrailSegment[];
  territory: [number, number][];  // Territorial boundary points
}

export interface FractalTrailNetwork {
  trailSystems: TrailSystem[];
  allSegments: TrailSegment[];
  intersectionPoints: Array<{
    position: [number, number];
    connectingSegments: [string, string];
  }>;
}

// Default world topology (hub-and-spoke crater structure)
export const DEFAULT_WORLD_TOPOLOGY: WorldTopology = {
  central_crater: {
    center: [0, 0],
    radius: 6.4,                      // 6.4km radius (San Francisco-sized)
    elevation: -200                   // 200m below sea level (ancient impact crater)
  },
  mountain_ring: {
    inner_radius: 6.4,                // Starts at crater rim
    outer_radius: 10.2,               // 10.2km from center
    elevation_range: [1200, 2000]     // 1200-2000m crater walls (high elevation)
  },
  ecosystem_slices: {
    slice_count: 3,                   // Three ecosystem slices for launch
    outer_radius: 25.6,               // 25.6km world boundary
    elevation_range: [300, 1000]      // 300-1000m peripheral to mountain approach
  }
};

// Default world generation configuration is exported from index.ts to avoid conflicts
