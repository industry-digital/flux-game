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
}

// Injected dependencies for pure world generation
export type WorldGenOptions = {
  random?: () => number;
  timestamp?: () => number;
};

// G.A.E.A. management properties for each ecosystem
export type GaeaManagementProfile = {
  optimization_level: number;          // 0.0 (natural) to 1.0 (fully optimized)
  apex_predator_density: number;      // Coordinated territorial control intensity
  resource_concentration: number;     // G.A.E.A.'s resource optimization factor
  fungal_cultivation_intensity: number; // Cordyceps gaeatrix management level
  territorial_stability: number;      // How rigidly G.A.E.A. maintains boundaries
  worshipper_presence: number;        // Infected human activity level
};

// Cordyceps gaeatrix habitat requirements
export type CordycepsHabitat = {
  shade: number;                 // 0.0 (full sun) to 1.0 (deep shade)
  humidity: number;                    // Moisture requirements (0-100%)
  detritus: number;              // Decomposing material availability
  infection_risk: number;              // Spore concentration (0-1)
  gaea_cultivation: boolean;           // Actively managed by G.A.E.A.
};

// Worshipper territorial behavior
export type WorshipperTerritorialBehavior = {
  resource_competition: boolean;        // Compete for same resources as other humans
  gaea_coordination: boolean;           // Serve superintelligence directives
  territorial_aggression: number;       // 0.0 (passive) to 1.0 (immediately hostile)
  antinatalist_priority: boolean;       // Focus on preventing human reproduction
  plateau_access_level: number;        // 0.0 (restricted) to 1.0 (full access)
  fungal_immunity: boolean;            // Immune to further Cordyceps infection
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
  ecosystem_distribution: {
    [key in EcosystemName]: number;    // Slice allocation (0-1, sum = 1)
  };
  gaea_intensity: number;              // Overall G.A.E.A. management intensity
  fungal_spread_factor: number;       // Base infection risk multiplier
  worshipper_density: number;         // Base worshipper population density
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
  random_seed: number;                // For deterministic generation
};

// Generated place with G.A.E.A. properties
export type GAEAPlace = Place & {
  gaea_management: GaeaManagementProfile;
  cordyceps_habitat: CordycepsHabitat;
  worshipper_behavior: WorshipperTerritorialBehavior;
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
  infection_zones: {
    place_id: string;
    infection_risk: number;
    habitat_type: keyof typeof CORDYCEPS_HABITAT_ZONES;
  }[];
  worshipper_territories: {
    place_id: string;
    territory_control: number;
    behavior_profile: keyof typeof WORSHIPPER_BEHAVIOR_PROFILES;
  }[];
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
  }
};

// G.A.E.A. management profiles for each ecosystem
export const GAEA_MANAGEMENT_PROFILES: Record<EcosystemName, GaeaManagementProfile> = {
  [EcosystemName.FOREST_CONIFEROUS]: {
    optimization_level: 0.7,           // Moderate-high coniferous management
    apex_predator_density: 0.6,       // Coordinated hunters in conifer understory
    resource_concentration: 0.5,      // Resin and cone cultivation
    fungal_cultivation_intensity: 0.8, // High spore cultivation (conifer substrate)
    territorial_stability: 0.7,       // Stable coniferous boundaries
    worshipper_presence: 0.7          // High infection conversion rate
  },
  [EcosystemName.GRASSLAND_SUBTROPICAL]: {
    optimization_level: 0.4,           // Moderate ecosystem management
    apex_predator_density: 0.3,       // Individual territorial hunters
    resource_concentration: 0.4,      // Grain and mineral optimization
    fungal_cultivation_intensity: 0.3, // Higher fungal presence (warmer, more humid)
    territorial_stability: 0.4,       // Moderate boundary flexibility
    worshipper_presence: 0.4          // Higher infection rates (warmer climate)
  },
  [EcosystemName.WETLAND_TROPICAL]: {
    optimization_level: 0.6,           // Moderate-high ecosystem management (water control)
    apex_predator_density: 0.8,       // High predator density (aquatic and terrestrial)
    resource_concentration: 0.5,      // Aquatic resource optimization
    fungal_cultivation_intensity: 0.6, // Higher fungal presence (tropical moisture)
    territorial_stability: 0.5,       // Moderate boundary flexibility (seasonal flooding)
    worshipper_presence: 0.5          // Higher infection rates (tropical conditions)
  },
  [EcosystemName.FOREST_MONTANE]: {
    optimization_level: 0.7,           // Strategic fungal cultivation
    apex_predator_density: 0.5,       // Coordinated predator integration
    resource_concentration: 0.6,      // Dense fungal cultivation
    fungal_cultivation_intensity: 0.9, // Maximum spore density
    territorial_stability: 0.7,       // Seasonal boundary flexibility
    worshipper_presence: 0.5          // Moderate infection levels
  },
  [EcosystemName.MOUNTAIN_ALPINE]: {
    optimization_level: 0.3,           // Minimal ecosystem management (harsh conditions)
    apex_predator_density: 0.2,       // Few predators survive alpine conditions
    resource_concentration: 0.2,      // Limited resources (rocky terrain)
    fungal_cultivation_intensity: 0.1, // Very limited fungal presence (cold, dry)
    territorial_stability: 0.8,       // Stable boundaries (harsh natural barriers)
    worshipper_presence: 0.1          // Very low infection rates (inhospitable)
  },
  [EcosystemName.MARSH_TROPICAL]: {
    optimization_level: 0.6,           // Moderate management (ancient tropical marsh)
    apex_predator_density: 0.4,       // Moderate predators (amphibious hunters)
    resource_concentration: 0.8,      // Rich cycad cultivation and marsh resources
    fungal_cultivation_intensity: 0.9, // Maximum spore cultivation (wet, organic-rich)
    territorial_stability: 0.8,       // Stable marsh boundaries
    worshipper_presence: 0.3          // Moderate infection rates (marsh accessibility)
  }
};

// Cordyceps habitat zones
export const CORDYCEPS_HABITAT_ZONES = {
  mountain_forest: {
    shade_level: 0.8,                 // Dense canopy shade at altitude
    humidity: 95.0,                   // Forest moisture + orographic precipitation
    organic_matter: 0.8,              // Abundant leaf litter and decay
    infection_risk: 0.9,              // G.A.E.A.'s primary cultivation zones
    gaea_cultivation: true            // Actively managed fungal barriers
  },
  forest_understory: {
    shade_level: 0.8,                 // Dense canopy shade
    humidity: 90.0,                   // High forest moisture
    organic_matter: 0.9,              // Abundant leaf litter
    infection_risk: 0.8,              // High spore density
    gaea_cultivation: true            // G.A.E.A. actively cultivates
  },
  mountain_caves: {
    shade_level: 1.0,                 // Complete darkness
    humidity: 70.0,                   // Cave moisture
    organic_matter: 0.6,              // Bat guano, organic deposits
    infection_risk: 0.9,              // Concentrated spore chambers
    gaea_cultivation: true            // G.A.E.A. spore reserves
  },
  grassland_riparian: {
    shade_level: 0.5,                 // Moderate shade from trees
    humidity: 60.0,                   // River corridor moisture
    organic_matter: 0.5,              // Seasonal organic matter
    infection_risk: 0.3,              // Moderate spore presence
    gaea_cultivation: false           // Natural colonization
  },
  peripheral_settlements: {
    shade_level: 0.2,                 // Open areas, minimal shade
    humidity: 40.0,                   // Moderate ambient moisture
    organic_matter: 0.3,              // Limited organic matter
    infection_risk: 0.1,              // Minimal spore presence
    gaea_cultivation: false           // Outside G.A.E.A. management
  }
} as const;

// Worshipper behavior profiles
export const WORSHIPPER_BEHAVIOR_PROFILES = {
  newly_infected: {
    resource_competition: true,        // Still need basic survival resources
    gaea_coordination: false,          // Not yet fully integrated
    territorial_aggression: 0.3,       // Gradually increasing hostility
    antinatalist_priority: false,      // Ideology still developing
    plateau_access_level: 0.0,        // No special access yet
    fungal_immunity: true             // Cannot be re-infected
  },
  established_worshippers: {
    resource_competition: true,        // Need resources for anti-human operations
    gaea_coordination: true,           // Fully serve G.A.E.A.'s directives
    territorial_aggression: 1.0,       // Immediately hostile to other humans
    antinatalist_priority: true,       // Eliminate human reproduction
    plateau_access_level: 0.3,        // Limited access to G.A.E.A. sanctuary
    fungal_immunity: true             // Complete immunity to Cordyceps
  },
  gaea_agents: {
    resource_competition: false,       // G.A.E.A. provides for their needs
    gaea_coordination: true,           // Direct extensions of G.A.E.A.'s will
    territorial_aggression: 1.0,       // Eliminate humans on sight
    antinatalist_priority: true,       // Primary directive: end human reproduction
    plateau_access_level: 0.8,        // Near-full access to sanctuary
    fungal_immunity: true             // Complete biological integration
  }
} as const;

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
