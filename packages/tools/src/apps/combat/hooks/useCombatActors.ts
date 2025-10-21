import { useState, useCallback, useEffect } from 'react';
import {
  createActor,
  createShell,
  mutateShellStats,
  type Actor,
  type ActorURN,
  type PlaceURN,
  type WeaponSchema,
  type WeaponSchemaURN, type SkillURN,
  type ItemURN,
  Stat,
  type TransformerContext,
  setHealthPercentage,
  HumanAnatomy,
  refreshStats,
  initializeHpFromRes,
  updateMaxHpFromRes,
  setNaturalStatValue,
  type AmmoSchemaURN,
  type AmmoSchema,
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
  updateActorStats: (actorId: ActorURN, stats: Partial<Record<Stat, number>>) => void;
}

export interface CombatActorsDependencies {
  createActor: typeof createActor;
  createShell: typeof createShell;
  mutateShellStats: typeof mutateShellStats;
  setHealthPercentage: typeof setHealthPercentage;
  initializeHpFromRes: typeof initializeHpFromRes;
  timestamp: () => number;
}

export const DEFAULT_COMBAT_ACTORS_DEPS: CombatActorsDependencies = {
  createActor,
  createShell,
  mutateShellStats,
  setHealthPercentage,
  initializeHpFromRes,
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

      // Get ammo schemas for auto-detection
      let ammoMap: Map<AmmoSchemaURN, AmmoSchema> = new Map();
      try {
        ammoMap = context.schemaManager.getSchemasOfType<AmmoSchemaURN, AmmoSchema>('ammo');
      } catch (error) {
        console.warn('Ammo schemas not available:', error);
      }

      const newActors: Record<ActorURN, Actor> = {};

      // Create actors from scenario data
      for (const [actorId, actorData] of Object.entries(scenarioData.actors) as [ActorURN, any][]) {
        const weaponSchema = weaponMap.get(actorData.weapon);
        if (!weaponSchema) {
          // Crash the program to find the root cause of malformed weapon URNs
          throw new Error(`Weapon schema not found: '${actorData.weapon}' for actor '${actorId}'. Available weapons: ${Array.from(weaponMap.keys()).join(', ')}. This indicates a malformed weapon URN in the scenario data.`);
        }

        const actor = createActorFromScenarioData(
          context,
          actorId,
          actorData,
          weaponSchema,
          ammoMap,
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

  const updateActorStats = useCallback((actorId: ActorURN, stats: Partial<Record<Stat, number>>) => {
    if (!context) return;

    const actor = context.world.actors[actorId];
    if (!actor) {
      console.warn(`Cannot update stats: actor ${actorId} not found`);
      return;
    }

    let resChanged = false;

    // Update stats using the actor stat utilities
    for (const [statKey, value] of Object.entries(stats)) {
      const stat = statKey as Stat;
      if (value !== undefined) {
        setNaturalStatValue(actor, stat, value);
        if (stat === Stat.RES) {
          resChanged = true;
        }
      }
    }

    // Refresh stats to recalculate effective values
    refreshStats(actor);

    // If RES changed, update max HP based on new RES value
    if (resChanged) {
      updateMaxHpFromRes(actor);
    }

    // Trigger re-render
    syncActorsFromContext();
  }, [context, syncActorsFromContext]);

  return {
    actors,
    availableWeapons,
    isInitialized,
    syncActorsFromContext,
    getActorWeapon,
    getActorSkills,
    updateActorWeapon,
    updateActorStats,
  };
}

// Constants for equipment setup
const TEST_WEAPON_ENTITY_URN: ItemURN = 'flux:item:weapon:test';


/**
 * Create an actor from scenario data using @flux/core utilities
 * Enhanced to use TransformerContext APIs for proper customization
 * Automatically adds appropriate ammo based on weapon requirements
 */
function createActorFromScenarioData(
  context: TransformerContext,
  actorId: ActorURN,
  actorData: any,
  weaponSchema: WeaponSchema,
  ammoMap: Map<AmmoSchemaURN, AmmoSchema>,
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
    gender: actorData.gender,
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

  // Refresh stats to ensure derived values are calculated correctly
  refreshStats(actor);

  // Initialize HP based on RES stat (this sets both max and current HP)
  deps.initializeHpFromRes(actor);

  // Add ammo to inventory if weapon requires it
  addAmmoToActor(context, actor, weaponSchema, actorData.ammo, ammoMap);

  return actor;
}

/**
 * Add appropriate ammo to actor's inventory based on weapon requirements
 */
function addAmmoToActor(
  context: TransformerContext,
  actor: Actor,
  weaponSchema: WeaponSchema,
  ammoConfig: AmmoSchemaURN | number | undefined,
  ammoMap: Map<AmmoSchemaURN, AmmoSchema>
): void {
  // Check if weapon requires ammo (ranged weapons have ammo property)
  if (!('ammo' in weaponSchema) || !weaponSchema.ammo?.type) {
    return; // Melee weapons don't need ammo
  }

  const weaponAmmoType = weaponSchema.ammo.type as AmmoSchemaURN;
  let ammoQuantity = 30; // Default quantity
  let ammoType = weaponAmmoType; // Default to weapon's ammo type

  // Handle custom ammo configuration
  if (ammoConfig !== undefined) {
    if (typeof ammoConfig === 'number') {
      ammoQuantity = ammoConfig;
    } else {
      // Custom ammo type specified
      ammoType = ammoConfig;
    }
  }

  // Verify ammo schema exists
  const ammoSchema = ammoMap.get(ammoType);
  if (!ammoSchema) {
    console.warn(`Ammo schema not found for ${ammoType}, skipping ammo setup`);
    return;
  }

  // Add ammo items to inventory using the proper inventory API
  const ammoInputs = Array.from({ length: ammoQuantity }, () => ({
    schema: ammoSchema.urn,
  }));

  try {
    context.inventoryApi.addItems(actor, ammoInputs);
  } catch (error) {
    console.warn(`Failed to add ammo to actor ${actor.id}:`, error);
  }
}

/**
 * Extract readable name from actor ID
 */
function getActorNameFromId(actorId: ActorURN): string {
  const parts = actorId.split(':');
  const name = parts[parts.length - 1];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
