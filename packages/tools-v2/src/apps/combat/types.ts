import type {
  ActorURN,
  PlaceURN,
  SessionURN,
  WeaponSchemaURN,
  SkillURN,
  TransformerContext,
  CombatSession,
  WorldEvent,
  WeaponSchema
} from '@flux/core';

/**
 * Combat-specific types for the Vue implementation
 * Adapted from the React version but optimized for Vue's reactivity system
 */

// Re-export commonly used types for convenience
export type { ActorURN, PlaceURN, SessionURN, WeaponSchemaURN, SkillURN, WorldEvent };

/**
 * Actor stat input for scenario customization
 */
export interface ActorStatsInput {
  pow?: number;
  fin?: number;
  res?: number;
  int?: number;
  per?: number;
  mem?: number;
}

/**
 * Combat scenario actor configuration
 */
export interface CombatScenarioActorData {
  stats: ActorStatsInput;
  aiControlled: boolean;
  weapon: WeaponSchemaURN;
  skills: {
    'flux:skill:evasion'?: number;
    'flux:skill:weapon:melee'?: number;
  };
}

/**
 * Complete combat scenario data for persistence
 */
export interface CombatScenarioData {
  actors: Record<ActorURN, CombatScenarioActorData>;
}

/**
 * Weapon map type for available weapons
 */
export type WeaponMap = Map<WeaponSchemaURN, WeaponSchema>;

/**
 * Combat phase enumeration
 */
export enum CombatPhase {
  SETUP = 'setup',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

/**
 * Combat log entry with enhanced metadata
 */
export interface CombatLogEntry extends WorldEvent {
  // Additional UI-specific properties can be added here
  narrative?: string;
  category?: 'action' | 'damage' | 'turn' | 'system';
}

/**
 * Optional combatant names for dynamic roster management
 */
export type OptionalCombatantName = 'charlie' | 'eric' | 'dave' | 'franz';

/**
 * Combat simulator state interface
 */
export interface CombatSimulatorState {
  // Initialization
  isInitialized: boolean;

  // Core entities
  context: TransformerContext | null;
  session: CombatSession | null;
  sessionId: SessionURN | null;

  // Actor management
  actors: Record<ActorURN, any>; // Using any for now, will be typed properly
  currentActorId: ActorURN | null;

  // Phase management
  phase: CombatPhase;

  // AI control
  aiControlled: Record<ActorURN, boolean>;
  aiThinking: ActorURN | null;

  // Equipment and skills
  availableWeapons: WeaponMap;

  // Event tracking for reactivity
  eventCount: number;
}

/**
 * Combat state management interface
 */
export interface CombatStateInterface {
  session: CombatSession | null;
  eventCount: number;
}

/**
 * Combat log management interface
 */
export interface CombatLogInterface {
  entries: CombatLogEntry[];
  maxEntries: number;
}

/**
 * Universal Intent System integration types
 */
export interface IntentExecutionResult {
  events: WorldEvent[];
  success: boolean;
  error?: string;
}
