import { useState, useCallback, useEffect } from 'react';
import {
  createActor,
  createShell,
  mutateShellStats,
  type Actor,
  type ActorURN,
  type PlaceURN,
  type WeaponSchema,
  type WeaponSchemaURN,
  type SkillURN,
  type ItemURN,
  Stat,
  type TransformerContext,
  setHealthPercentage,
  HumanAnatomy,
  refreshStats,
} from '@flux/core';
import type { CombatScenarioData } from './useCombatScenario';

export interface UseCombatActorsResult {
  actors: Record<ActorURN, Actor>;
  availableWeapons: Map<WeaponSchemaURN, WeaponSchema>;
  isInitialized: boolean;
  syncActorsFromContext: () => void;
  getActorWeapon: (actorId: ActorURN) => WeaponSchemaURN;
  getActorSkills: (actorId: ActorURN) => Record<SkillURN, number>;
  updateActorWeapon: (actorId: ActorURN, weaponUrn: WeaponSchemaURN) => void;
}

export interface CombatActorsDependencies {
  createActor: typeof createActor;
  createShell: typeof createShell;
  mutateShellStats: typeof mutateShellStats;
  setHealthPercentage: typeof setHealthPercentage;
  timestamp: () => number;
}

export const DEFAULT_COMBAT_ACTORS_DEPS: CombatActorsDependencies = {
  createActor,
  createShell,
  mutateShellStats,
  setHealthPercentage,
  timestamp: () => Date.now(),
};

/**
 * Hook for managing combat actors and their lifecycle
 * Handles actor creation, stat management, and context synchronization
 */
export function useCombatActors(
  context: TransformerContext,
  scenarioData: CombatScenarioData,
  placeId: PlaceURN,
  deps: CombatActorsDependencies = DEFAULT_COMBAT_ACTORS_DEPS
): UseCombatActorsResult {
  const [actors, setActors] = useState<Record<ActorURN, Actor>>({});
  const [availableWeapons, setAvailableWeapons] = useState<Map<WeaponSchemaURN, WeaponSchema>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize actors using the provided context
  useEffect(() => {
    try {
      const weaponMap = context.schemaManager.getSchemasOfType<WeaponSchemaURN, WeaponSchema>('weapon');
      setAvailableWeapons(weaponMap);

      const newActors: Record<ActorURN, Actor> = {};

      // Create actors from scenario data
      for (const [actorId, actorData] of Object.entries(scenarioData.actors) as [ActorURN, any][]) {
        const weaponSchema = weaponMap.get(actorData.weapon);
        if (!weaponSchema) {
          console.warn(`Weapon schema not found: ${actorData.weapon}`);
          continue;
        }

        const actor = createActorFromScenarioData(
          context,
          actorId,
          actorData,
          weaponSchema,
          placeId,
          deps
        );

        context.world.actors[actorId] = actor;
        newActors[actorId] = actor;
      }

      setActors(newActors);
      setIsInitialized(true);
    } catch (error) {
      console.error('❌ Combat actors initialization failed:', error);
    }
  }, [context, scenarioData, placeId, deps]);

  const syncActorsFromContext = useCallback(() => {
    if (!context) return;

    const updatedActors: Record<ActorURN, Actor> = {};
    for (const actorId in context.world.actors) {
      const actor = context.world.actors[actorId as ActorURN];
      updatedActors[actorId as ActorURN] = { ...actor }; // Create new reference for React
    }
    setActors(updatedActors);
  }, [context]);

  const getActorWeapon = useCallback((actorId: ActorURN): WeaponSchemaURN => {
    const actorData = scenarioData.actors[actorId];
    if (actorData?.weapon) {
      return actorData.weapon;
    }
    // Return first available weapon as fallback
    for (const [weaponUrn] of availableWeapons) {
      return weaponUrn;
    }
    throw new Error('No weapons available');
  }, [scenarioData, availableWeapons]);

  const getActorSkills = useCallback((actorId: ActorURN): Record<SkillURN, number> => {
    const actorData = scenarioData.actors[actorId];
    return actorData?.skills || {};
  }, [scenarioData]);

  const updateActorWeapon = useCallback((actorId: ActorURN, weaponUrn: WeaponSchemaURN) => {
    if (!context) return;

    const actor = context.world.actors[actorId];
    const weaponSchema = availableWeapons.get(weaponUrn);

    if (!actor || !weaponSchema) {
      console.warn(`Cannot update weapon: actor ${actorId} or weapon ${weaponUrn} not found`);
      return;
    }

    // Update inventory item schema reference
    const weaponItem = actor.inventory.items[TEST_WEAPON_ENTITY_URN];
    if (weaponItem) {
      weaponItem.schema = weaponSchema.urn;
    }

    // Trigger re-render
    syncActorsFromContext();
  }, [context, availableWeapons, syncActorsFromContext]);

  return {
    actors,
    availableWeapons,
    isInitialized,
    syncActorsFromContext,
    getActorWeapon,
    getActorSkills,
    updateActorWeapon,
  };
}

// Constants for equipment setup
const TEST_WEAPON_ENTITY_URN: ItemURN = 'flux:item:weapon:test';

/**
 * Create an actor from scenario data using @flux/core utilities
 * Enhanced to use TransformerContext APIs for proper customization
 */
function createActorFromScenarioData(
  context: TransformerContext,
  actorId: ActorURN,
  actorData: any,
  weaponSchema: WeaponSchema,
  placeId: PlaceURN,
  deps: CombatActorsDependencies
): Actor {
  const { pow = 10, fin = 10, res = 10, int = 10, per = 10, mem = 10 } = actorData.stats;

  // Create shell with physical stats
  const shell = deps.createShell({
    name: getActorNameFromId(actorId),
  });

  // Apply physical stats to shell (POW, FIN, RES)
  deps.mutateShellStats(shell.stats, {
    [Stat.POW]: pow,
    [Stat.FIN]: fin,
    [Stat.RES]: res,
  });

  // Create actor with basic setup
  const actor = deps.createActor({
    id: actorId,
    name: getActorNameFromId(actorId),
    location: placeId,
    stats: {
      [Stat.INT]: { nat: int, eff: int, mods: {} },
      [Stat.PER]: { nat: per, eff: per, mods: {} },
      [Stat.MEM]: { nat: mem, eff: mem, mods: {} },
    },
    skills: {}, // Start with empty skills, will be set via context API
    currentShell: shell.id,
    shells: {
      [shell.id]: shell,
    },
    // Equipment setup - weapon equipped in right hand
    equipment: {
      [HumanAnatomy.RIGHT_HAND]: {
        [TEST_WEAPON_ENTITY_URN]: 1 as const,
      },
    },
    // Inventory setup - weapon item with schema reference
    inventory: {
      mass: 1_000, // 1kg default mass
      ts: deps.timestamp(),
      items: {
        [TEST_WEAPON_ENTITY_URN]: {
          id: TEST_WEAPON_ENTITY_URN,
          schema: weaponSchema.urn, // Link to the weapon schema
        },
      },
    },
  });

  // Apply skill customizations using context API
  if (actorData.skills && Object.keys(actorData.skills).length > 0) {
    context.actorSkillApi.setActorSkillRanks(actor, actorData.skills);
  }

  // Apply stat customizations using context utilities
  // Note: Physical stats (POW, FIN, RES) are already applied to shell above
  // Mental stats (INT, PER, MEM) are applied during actor creation above

  // Refresh stats to ensure derived values (HP, etc.) are calculated correctly
  refreshStats(actor);

  // Set full health based on updated stats
  deps.setHealthPercentage(actor, 1.0);

  return actor;
}

/**
 * Extract readable name from actor ID
 */
function getActorNameFromId(actorId: ActorURN): string {
  const parts = actorId.split(':');
  const name = parts[parts.length - 1];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
