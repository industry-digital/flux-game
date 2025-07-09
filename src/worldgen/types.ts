/**
 * Pure, deterministic world generation library types
 * Integrates with existing Place types and weather system
 */

import { Place } from '@flux';
import { EcologicalProfile } from '~/types/entity/place';

// Ecosystem URNs following existing taxonomy system
export enum EcosystemName {
  MOUNTAIN_ALPINE = 'flux:eco:mountain:alpine',
  MOUNTAIN_FOREST = 'flux:eco:mountain:forest',
  GRASSLAND_TEMPERATE = 'flux:eco:grassland:temperate',
  GRASSLAND_ARID = 'flux:eco:grassland:arid',
  FOREST_TEMPERATE = 'flux:eco:forest:temperate',
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

// Hub-and-spoke topology structure
export type WorldTopology = {
  central_plateau: {
    center: [number, number];          // World center coordinates
    radius: number;                    // Plateau radius in km
    elevation: number;                 // Elevation in meters
  };
  mountain_ring: {
    inner_radius: number;              // Mountain ring inner boundary
    outer_radius: number;              // Mountain ring outer boundary
    elevation_range: [number, number]; // Min/max elevation
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
  random_seed: number;                // For deterministic generation
};

// Generated place with G.A.E.A. properties
export type GAEAPlace = Place & {
  gaea_management: GaeaManagementProfile;
  cordyceps_habitat: CordycepsHabitat;
  worshipper_behavior: WorshipperTerritorialBehavior;
  topology_zone: 'plateau' | 'mountain_ring' | 'ecosystem_slice' | 'periphery';
  distance_from_center: number;       // 0.0 (center) to 1.0 (edge)
  ecosystem_slice_id?: number;        // Which ecosystem slice (if applicable)
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
};

// Ecosystem schema definitions
export const ECOSYSTEM_PROFILES: Record<EcosystemName, EcologicalProfile> = {
  [EcosystemName.FOREST_TEMPERATE]: {
    ecosystem: 'flux:eco:forest:temperate',
    temperature: [8.0, 28.0],          // Cool to warm temperate forest
    pressure: [1000.0, 1020.0],        // Standard atmospheric pressure
    humidity: [60.0, 95.0]             // High humidity (forest conditions)
  },
  [EcosystemName.GRASSLAND_TEMPERATE]: {
    ecosystem: 'flux:eco:grassland:temperate',
    temperature: [12.0, 32.0],         // Warm temperate grassland
    pressure: [1005.0, 1023.0],        // Slightly elevated pressure
    humidity: [40.0, 60.0]             // Moderate humidity
  },
  [EcosystemName.GRASSLAND_ARID]: {
    ecosystem: 'flux:eco:grassland:arid',
    temperature: [18.0, 45.0],         // Hot arid grassland
    pressure: [1010.0, 1025.0],        // High pressure (dry conditions)
    humidity: [15.0, 35.0]             // Low humidity (arid conditions)
  },
  [EcosystemName.MOUNTAIN_ALPINE]: {
    ecosystem: 'flux:eco:mountain:alpine',
    temperature: [5.0, 25.0],          // Cool alpine conditions
    pressure: [950.0, 1000.0],         // Low pressure (high altitude)
    humidity: [50.0, 90.0]             // Variable humidity (orographic effects)
  },
  [EcosystemName.MOUNTAIN_FOREST]: {
    ecosystem: 'flux:eco:mountain:forest',
    temperature: [-5.0, 18.0],         // Cooler than lowland forest (altitude effect)
    pressure: [900.0, 980.0],          // Low pressure (high altitude)
    humidity: [70.0, 95.0]             // High humidity (forest + orographic precipitation)
  }
};

// G.A.E.A. management profiles for each ecosystem
export const GAEA_MANAGEMENT_PROFILES: Record<EcosystemName, GaeaManagementProfile> = {
  [EcosystemName.FOREST_TEMPERATE]: {
    optimization_level: 0.8,           // High biodiversity priority
    apex_predator_density: 0.7,       // Pack hunters in understory
    resource_concentration: 0.6,      // Medicinal plant cultivation
    fungal_cultivation_intensity: 0.9, // Maximum spore cultivation
    territorial_stability: 0.6,       // Seasonal boundary flexibility
    worshipper_presence: 0.8          // High infection conversion rate
  },
  [EcosystemName.GRASSLAND_TEMPERATE]: {
    optimization_level: 0.4,           // Moderate ecosystem management
    apex_predator_density: 0.3,       // Individual territorial hunters
    resource_concentration: 0.4,      // Grain and mineral optimization
    fungal_cultivation_intensity: 0.2, // Limited fungal presence
    territorial_stability: 0.4,       // Moderate boundary flexibility
    worshipper_presence: 0.3          // Lower infection rates
  },
  [EcosystemName.GRASSLAND_ARID]: {
    optimization_level: 0.2,           // Minimal ecosystem management
    apex_predator_density: 0.1,       // Sparse predator presence
    resource_concentration: 0.2,      // Limited resource optimization
    fungal_cultivation_intensity: 0.1, // Very limited fungal presence
    territorial_stability: 0.2,       // High boundary flexibility
    worshipper_presence: 0.1          // Very low infection rates
  },
  [EcosystemName.MOUNTAIN_ALPINE]: {
    optimization_level: 0.9,           // Strategic territorial control
    apex_predator_density: 0.9,       // Massive individual predators
    resource_concentration: 0.8,      // Rare mineral concentration
    fungal_cultivation_intensity: 0.7, // Cave spore chambers
    territorial_stability: 0.8,       // Rigid boundary control
    worshipper_presence: 0.6          // Moderate infection levels
  },
  [EcosystemName.MOUNTAIN_FOREST]: {
    optimization_level: 0.7,           // Strategic fungal cultivation
    apex_predator_density: 0.5,       // Coordinated predator integration
    resource_concentration: 0.6,      // Dense fungal cultivation
    fungal_cultivation_intensity: 0.9, // Maximum spore density
    territorial_stability: 0.7,       // Seasonal boundary flexibility
    worshipper_presence: 0.5          // Moderate infection levels
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

// Default world topology (hub-and-spoke structure)
export const DEFAULT_WORLD_TOPOLOGY: WorldTopology = {
  central_plateau: {
    center: [0, 0],
    radius: 6.4,                      // 6.4km radius (San Francisco-sized)
    elevation: 1500                   // 1500m elevation
  },
  mountain_ring: {
    inner_radius: 6.4,                // Starts at plateau boundary
    outer_radius: 10.2,               // 10.2km from center
    elevation_range: [1000, 1400]     // 1000-1400m varied peaks and valleys
  },
  ecosystem_slices: {
    slice_count: 3,                   // Three ecosystem slices for launch
    outer_radius: 25.6,               // 25.6km world boundary
    elevation_range: [300, 1000]      // 300-1000m peripheral to mountain approach
  }
};

// Default world generation configuration is exported from index.ts to avoid conflicts
