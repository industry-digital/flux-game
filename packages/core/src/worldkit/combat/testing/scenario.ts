import { Actor, Stat, ActorStats, Gender } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { AmmoSchema } from '~/types/schema/ammo';
import { ActorURN, PlaceURN, SkillSchemaURN, WeaponItemURN, WeaponSchemaURN, AmmoSchemaURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';
import { Battlefield, BattlefieldPosition, Combatant, CombatFacing, CombatSession, Team } from '~/types/combat';
import { createCombatSessionApi } from '../session/session';
import { CombatantApi } from '~/worldkit/combat/combatant';
import { DEFAULT_BATTLEFIELD } from '~/worldkit/combat/battlefield';
import { SkillState } from '~/types/entity/skill';
import { SchemaManager } from '~/worldkit/schema/manager';
import { createDefaultSkillState } from '~/worldkit/entity/actor/skill';
import { setEnergy, setCapacitorPosition } from '~/worldkit/entity/actor/capacitor';
import { setAp } from '~/worldkit/combat/ap';
import { createActor } from '~/worldkit/entity/actor';
import { syncShellStatsToActor } from '~/worldkit/entity/actor/shell';

export type CombatScenarioDependencies = {
  useCombatSession: typeof createCombatSessionApi;
};

export const DEFAULT_TEST_SCENARIO_DEPS: CombatScenarioDependencies = {
  useCombatSession: createCombatSessionApi,
};

export type CombatScenarioActorHooks = {
  combatant: CombatantApi;
};

export type CombatScenarioActor = {
  actor: Actor;
  hooks: CombatScenarioActorHooks;
};

export type ActorEquipmentSetup = {
  weapon: WeaponSchemaURN;
  ammo?: AmmoSchemaURN | number; // URN or quantity (auto-detects from weapon)
};

export type ActorSingleStatSetup = number | Partial<ActorStats[keyof ActorStats]>;
export type ActorStatsSetup = { int?: ActorSingleStatSetup; per?: ActorSingleStatSetup; mem?: ActorSingleStatSetup; pow?: ActorSingleStatSetup; fin?: ActorSingleStatSetup; res?: ActorSingleStatSetup };
export type ActorSkillSetup = number | Partial<SkillState>;
export type ActorApSetup = number | Partial<Combatant['ap']>;
export type ActorEnergySetup = number | { position?: number; energy?: number };
export type ActorHpSetup = number | Partial<Actor['hp']>;

export type CombatScenarioActorInput = {
  team: Team | string;
  name?: string;
  stats?: ActorStatsSetup;
  skills?: Record<SkillSchemaURN, ActorSkillSetup>;
  ap?: ActorApSetup;
  energy?: ActorEnergySetup;
  position?: Partial<BattlefieldPosition>;
  equipment?: ActorEquipmentSetup;
  target?: ActorURN;
  hp?: ActorHpSetup;
  gender?: Gender;
};

export type CombatScenarioHook = {
  actors: Record<ActorURN, CombatScenarioActor>;
  session: CombatSession;
  context: TransformerContext;
};

const DEFAULT_SKILL_STATE: Readonly<SkillState> = createDefaultSkillState();

export type CombatScenarioInput = {
  participants: Record<ActorURN, CombatScenarioActorInput>;
  weapons: WeaponSchema[];
  ammo?: AmmoSchema[]; // Optional ammo schemas, auto-loaded if not provided
  battlefield?: Battlefield;
  schemaManager?: SchemaManager;
  location?: PlaceURN; // Optional custom location, defaults to TEST_PLACE_ID
};

/**
 * Creates a complete combat scenario with actors, equipment, and a combat session.
 *
 * All actors are automatically placed at the same location (TEST_PLACE_ID by default)
 * to ensure they can participate in combat together. This prevents validation errors
 * when starting combat, as all combatants must be at the combat location.
 *
 * @param context - The transformer context
 * @param input - Scenario configuration including participants, weapons, and optional location
 * @param dependencies - Injectable dependencies for testing (optional)
 * @returns A complete combat scenario with actors, session, and hooks
 * @deprecated Use createWorldScenario instead
 */
export function useCombatScenario(
  context: TransformerContext,
  input: CombatScenarioInput,
  {
    useCombatSession: useCombatSessionImpl,
  }: CombatScenarioDependencies = DEFAULT_TEST_SCENARIO_DEPS,
): CombatScenarioHook {
  const {
    participants,
    weapons,
    ammo,
    battlefield = DEFAULT_BATTLEFIELD,
    location,
  } = input;

  const testContext: TransformerContext = {
    ...context,
    schemaManager: input.schemaManager ?? new SchemaManager(),
  };

  // Use provided location or default test battlefield location
  const TEST_PLACE_ID: PlaceURN = location ?? 'flux:place:test-battlefield';

  const scenario: CombatScenarioHook = {
    actors: {},
    session: null as any, // Will be set after session creation
    context: testContext,
  };

  // Set up testing infrastructure to handle weapon and ammo schemas
  if (weapons) {
    const weaponLoaderMap: Map<WeaponSchemaURN, WeaponSchema> = new Map();
    for (const weaponSchema of weapons) {
      weaponLoaderMap.set(weaponSchema.urn as WeaponSchemaURN, weaponSchema);
    }
    testContext.schemaManager.registerLoader('weapon', () => weaponLoaderMap, true);
  }

  // Set up ammo schemas - either provided or auto-loaded from schema manager
  let ammoSchemas: AmmoSchema[] = [];
  if (ammo) {
    ammoSchemas = ammo;
  } else {
    // Auto-load ammo schemas from the schema manager
    try {
      const ammoLoaderMap = testContext.schemaManager.getSchemasOfType('ammo');
      ammoSchemas = Array.from(ammoLoaderMap.values()) as AmmoSchema[];
    } catch {
      // If no ammo loader registered, create empty array
      ammoSchemas = [];
    }
  }

  if (ammoSchemas.length > 0) {
    const ammoLoaderMap: Map<AmmoSchemaURN, AmmoSchema> = new Map();
    for (const ammoSchema of ammoSchemas) {
      ammoLoaderMap.set(ammoSchema.urn as AmmoSchemaURN, ammoSchema);
    }
    testContext.schemaManager.registerLoader('ammo', () => ammoLoaderMap, true);
  }

  // Load all schemas after registering loaders
  if (weapons || ammoSchemas.length > 0) {
    testContext.schemaManager.loadAllSchemas(true);
  }

  // Create a new combat session (useCombatSession will create it if no sessionId is provided)
  const sessionHook = useCombatSessionImpl(testContext, TEST_PLACE_ID, undefined, battlefield);

  scenario.session = sessionHook.session;

  // Phase 1: Create actors and add them as combatants to the session
  for (const actorId in participants) {
    const participant = participants[actorId as ActorURN];
    const actorName = participant.name || actorId.split(':').pop() || 'Test Actor';
    const stats = participant.stats;

    // Helper function to process a single stat setup
    const processSingleStat = (statSetup: ActorSingleStatSetup | undefined, defaultValue: number = 10): ActorStats[keyof ActorStats] => {
      if (typeof statSetup === 'number') {
        return statSetup;
      }
      return defaultValue;
    };

    // Helper function to process HP setup
    const processHpSetup = (hpSetup: ActorHpSetup | undefined, defaultHp: Actor['hp']): Actor['hp'] => {
      if (typeof hpSetup === 'number') {
        return { max: hpSetup, current: hpSetup };
      }
      return { max: defaultHp.max, current: defaultHp.current };
    };

    // Create the actor with stats, skills, HP, and location
    // Start with default combat skills that all actors need
    const defaultSkills: Record<SkillSchemaURN, SkillState> = {};
    defaultSkills['flux:schema:skill:weapon:melee'] = { ...DEFAULT_SKILL_STATE, rank: 1 };
    defaultSkills['flux:schema:skill:evasion'] = { ...DEFAULT_SKILL_STATE, rank: 1 };

    // Add any explicitly configured skills, allowing overrides of defaults
    const configuredSkills = Object.keys(participant.skills || {}).reduce((acc, skillUrn) => {
      const skillInputValue = participant.skills?.[skillUrn as SkillSchemaURN];
      if (typeof skillInputValue === 'number') {
        acc[skillUrn as SkillSchemaURN] = { ...DEFAULT_SKILL_STATE, rank: skillInputValue };
      } else {
        acc[skillUrn as SkillSchemaURN] = { ...DEFAULT_SKILL_STATE, ...skillInputValue };
      }
      return acc;
    }, {} as Record<SkillSchemaURN, SkillState>);

    const actor = createActor((actor: Actor) => {
      const finalSkills = { ...defaultSkills, ...configuredSkills } as Record<SkillSchemaURN, SkillState>;

      // Set mental stats directly on actor
      const updatedActor: Actor = {
        ...actor,
        id: actorId as ActorURN,
        name: actorName,
        location: TEST_PLACE_ID, // Ensure actor is at the combat location
        skills: finalSkills,
        gender: participant.gender ?? Gender.MALE,
        stats: {
          ...actor.stats,
          [Stat.INT]: processSingleStat(stats?.int, 10),
          [Stat.PER]: processSingleStat(stats?.per, 10),
          [Stat.MEM]: processSingleStat(stats?.mem, 10),
        },
        hp: processHpSetup(participant.hp, actor.hp),
      };

      // Set physical stats on shell if shells exist
      if (updatedActor.shells && updatedActor.currentShell) {
        const currentShell = updatedActor.shells[updatedActor.currentShell];
        if (currentShell) {
          currentShell.stats[Stat.POW] = processSingleStat(stats?.pow, 10);
          currentShell.stats[Stat.FIN] = processSingleStat(stats?.fin, 10);
          currentShell.stats[Stat.RES] = processSingleStat(stats?.res, 10);

          // Sync shell stats to actor (materialized view pattern)
          syncShellStatsToActor(updatedActor);
        }
      }

      return updatedActor;
    });

    // Add actor to world context BEFORE adding combatant
    testContext.world.actors[actor.id] = actor;

    // Create default position if not provided
    const defaultPosition: BattlefieldPosition = {
      coordinate: 100, // Default to center of battlefield
      facing: CombatFacing.RIGHT,
      speed: 0,
    };

    // Merge provided position with defaults
    const finalPosition: BattlefieldPosition = {
      ...defaultPosition,
      ...participant.position,
    };

    // Add combatant to session with processed position using the actor's actual ID
    sessionHook.addCombatant(actor.id, participant.team, finalPosition);

    // Set target if specified
    if (participant.target) {
      const combatant = sessionHook.session.data.combatants.get(actor.id);
      if (combatant) {
        combatant.target = participant.target;
      }
    }
  }

  // Phase 2: Create hooks and process combatant attributes
  for (const actorId in participants) {
    const participant = participants[actorId as ActorURN];
    const actor = testContext.world.actors[actorId as ActorURN];

    // Create combatant hook now that the combatant exists in the session
    const combatantHook = sessionHook.getCombatantApi(actor.id);

    // Use equipment/inventory APIs from context (not exposed in public interface)
    const inventoryApi = testContext.inventoryApi;
    const equipmentApi = testContext.equipmentApi;
    const weaponApi = testContext.weaponApi;

    const { ap, energy, equipment } = participant;

    // Process combatant attributes (AP, balance)
    const combatant = sessionHook.session.data.combatants.get(actor.id);
    if (!combatant) {
      throw new Error(`Combatant not found for actor ${actor.id}`);
    }

    // Process AP setup using the dedicated setAp function
    if (ap !== undefined) {
      if (typeof ap === 'number') {
        setAp(combatant, ap, ap);
      } else {
        // Handle partial AP object setup
        if (ap.current !== undefined) {
          combatant.ap.current = ap.current;
        }
        if (ap.max !== undefined) {
          combatant.ap.max = ap.max;
        }
      }
    }

    // Process energy setup using capacitor API (internal - not exposed in public API)
    if (energy !== undefined) {
      if (typeof energy === 'number') {
        // Simple number: set energy directly in Joules
        setEnergy(actor, energy);
      } else {
        // Complex object: can specify position or energy
        if (energy.position !== undefined) {
          // Position is authoritative - preferred method
          setCapacitorPosition(actor, energy.position);
        } else if (energy.energy !== undefined) {
          // Set energy directly in Joules
          setEnergy(actor, energy.energy);
        }
      }
    }

    // Process equipment setup (internal - not exposed in public API)
    if (equipment?.weapon) {
      const weaponItem = inventoryApi.addItem(actor, { schema: equipment.weapon });
      inventoryApi.refreshInventory(actor);
      equipmentApi.equip(actor, weaponItem.id as WeaponItemURN);

      // Auto-add appropriate ammo for the weapon
      const weaponSchema = testContext.schemaManager.getSchema(equipment.weapon);
      if ('ammo' in weaponSchema && weaponSchema.ammo?.type) {
        const ammoType = weaponSchema.ammo.type as AmmoSchemaURN;
        let ammoQuantity = 30; // Default quantity

        // Handle custom ammo setup
        if (equipment.ammo !== undefined) {
          if (typeof equipment.ammo === 'number') {
            ammoQuantity = equipment.ammo;
          } else {
            // Custom ammo type specified - use unified magazine system
            weaponApi.addAmmoToInventory(actor, equipment.ammo, ammoQuantity);
            // Skip auto-ammo since custom ammo was added - continue to next actor
            continue;
          }
        }

        // Add auto-detected ammo type using unified magazine system
        try {
          weaponApi.addAmmoToInventory(actor, ammoType, ammoQuantity);
        } catch (error) {
          // Ammo schema not found - continue without ammo
          console.warn(`Ammo schema not found for weapon ${equipment.weapon}: ${ammoType}`);
        }
      }
    }

    // Store the scenario actor with only the combatant hook (clean public interface)
    scenario.actors[actor.id] = {
      actor,
      hooks: {
        combatant: combatantHook,
      },
    };
  }

  return scenario;
}
