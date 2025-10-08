import type {
  EnrichedWorldEvent,
  Actor,
  Combatant,
  CombatSession as CoreCombatSession,
  Battlefield as CoreBattlefield,
  WeaponSchema,
  WorldEvent,
} from '@flux/core';
import { Team } from '@flux/core';
import { SessionStatus } from '@flux/core';

/**
 * Combat log entry is just a WorldEvent
 */
export type CombatLogEntry = WorldEvent;

/**
 * Combat phase enum - maps to SessionStatus for consistency
 */
export enum CombatPhase {
  SETUP = 'setup', // Custom setup phase before combat
  ACTIVE = SessionStatus.RUNNING,
  PAUSED = SessionStatus.PAUSED,
  ENDED = SessionStatus.TERMINATED
}

/**
 * Actor setup data for the setup phase (extends core Actor)
 */
export type ActorSetupData = Actor & {
  team: Team;
  isAI: boolean;
  weaponUrn: string;
  canRemove: boolean; // Alice and Bob cannot be removed
};

/**
 * Extended combat session for UI purposes
 */
export type CombatSession = CoreCombatSession & {
  phase: CombatPhase;
  log: CombatLogEntry[];
  // UI-specific extensions
  uiState?: {
    aiThinking?: string | null;
  };
};

/**
 * Extended combatant data for UI display
 */
export type CombatantData = Combatant & {
  name: string; // Actor name for UI display
  isAIThinking: boolean;
  weaponSchema?: WeaponSchema;
};

/**
 * Battlefield configuration for UI (extends core battlefield)
 */
export type BattlefieldData = CoreBattlefield & {
  // UI needs 2D representation on top of core linear battlefield
  width: number;
  height: number;
  gridSize: number;
  obstacles?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
  }>;
};

/**
 * Combat scenario configuration
 */
export interface CombatScenario {
  id: string;
  name: string;
  description: string;
  battlefield: BattlefieldData;
  actors: ActorSetupData[];
}

/**
 * Universal Intent execution result
 */
export interface IntentResult {
  success: boolean;
  message: string;
  events?: EnrichedWorldEvent[];
  error?: string;
}

// Re-export core types for convenience
export { Team, type WeaponSchema };
