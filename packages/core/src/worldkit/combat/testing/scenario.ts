import { Actor, Stat, ActorStats } from '~/types/entity/actor';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN, PlaceURN, SkillSchemaURN, WeaponItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';
import { Battlefield, BattlefieldPosition, Combatant, CombatFacing, CombatSession, Team } from '~/types/combat';
import { createCombatSessionApi } from '../session/session';
import { CombatantApi } from '~/worldkit/combat/combatant';
import { DEFAULT_BATTLEFIELD } from '~/worldkit/combat/battlefield';
import { SkillState } from '~/types/entity/skill';
import { SchemaManager } from '~/worldkit/schema/manager';
import { createDefaultSkillState } from '~/worldkit/entity/actor/skill';
import { setEnergy, setPosition } from '~/worldkit/entity/actor/capacitor';
import { createActor } from '~/worldkit/entity/actor';

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
};

export type ActorSingleStatSetup = number | Partial<ActorStats[keyof ActorStats]>;
export type ActorStatsSetup = { int?: ActorSingleStatSetup; per?: ActorSingleStatSetup; mem?: ActorSingleStatSetup; pow?: ActorSingleStatSetup; fin?: ActorSingleStatSetup; res?: ActorSingleStatSetup };
export type ActorSkillSetup = number | Partial<SkillState>;
export type ActorApSetup = number | Partial<Combatant['ap']>;
export type ActorEnergySetup = number | { position?: number; energy?: number };
export type ActorBalanceSetup = number | Partial<Combatant['balance']>;
export type ActorHpSetup = number | Partial<Actor['hp']>;

export type CombatScenarioActorInput = {
  team: Team | string;
  name?: string;
  stats?: ActorStatsSetup;
  skills?: Record<SkillSchemaURN, ActorSkillSetup>;
  ap?: ActorApSetup;
  energy?: ActorEnergySetup;
  balance?: ActorBalanceSetup;
  position?: Partial<BattlefieldPosition>;
  equipment?: ActorEquipmentSetup;
  target?: ActorURN;
  hp?: ActorHpSetup;
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
 */
export function useCombatScenario(
  context: TransformerContext,
  input: CombatScenarioInput,
  {
    useCombatSession: useCombatSessionImpl,
  }: CombatScenarioDependencies = DEFAULT_TEST_SCENARIO_DEPS,
) {
  const {
    participants,
    weapons,
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

  // Set up testing infrastructure to handle weapon schemas
  if (weapons) {
    const loaderMap: Map<WeaponSchemaURN, WeaponSchema> = new Map();
    for (const weaponSchema of weapons) {
      loaderMap.set(weaponSchema.urn as WeaponSchemaURN, weaponSchema);
    }
    testContext.schemaManager.registerLoader('weapon', () => loaderMap, true);
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
    const processSingleStat = (statSetup: ActorSingleStatSetup | undefined, defaultValue: number = 10) => {
      if (typeof statSetup === 'number') {
        return { nat: statSetup, eff: statSetup, mods: {} };
      } else if (statSetup) {
        return { nat: defaultValue, eff: defaultValue, mods: {}, ...statSetup };
      } else {
        return { nat: defaultValue, eff: defaultValue, mods: {} };
      }
    };

    // Helper function to process HP setup
    const processHpSetup = (hpSetup: ActorHpSetup | undefined, defaultHp: Actor['hp']) => {
      if (typeof hpSetup === 'number') {
        return {
          nat: { cur: hpSetup, max: hpSetup },
          eff: { cur: hpSetup, max: hpSetup },
          mods: {},
        };
      } else if (hpSetup) {
        return { ...defaultHp, ...hpSetup };
      }
      return defaultHp;
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

      return {
        ...actor,
        id: actorId as ActorURN,
        name: actorName,
        location: TEST_PLACE_ID, // Ensure actor is at the combat location
        skills: finalSkills,
        stats: {
          ...actor.stats,
          [Stat.INT]: processSingleStat(stats?.int, 10),
          [Stat.PER]: processSingleStat(stats?.per, 10),
          [Stat.MEM]: processSingleStat(stats?.mem, 10),
        },
        shells: {
          ...actor.shells,
          [actor.currentShell]: {
            ...actor.shells[actor.currentShell],
            stats: {
              ...actor.shells[actor.currentShell].stats,
              [Stat.POW]: processSingleStat(stats?.pow, 10),
              [Stat.FIN]: processSingleStat(stats?.fin, 10),
              [Stat.RES]: processSingleStat(stats?.res, 10),
            },
          },
        },
        hp: processHpSetup(participant.hp, actor.hp),
      };
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

    const { ap, energy, balance, equipment } = participant;

    // Helper function to process combatant attributes
    const processCombatantAttribute = (
      attributeSetup: number | Partial<Combatant['ap']> | undefined,
      currentAttribute: Combatant['ap'],
    ) => {
      if (typeof attributeSetup === 'number') {
        return {
          ...currentAttribute,
          nat: { cur: attributeSetup, max: attributeSetup },
          eff: { cur: attributeSetup, max: attributeSetup },
        };
      } else if (attributeSetup) {
        return { ...currentAttribute, ...attributeSetup };
      }
      return currentAttribute;
    };

    // Process combatant attributes (AP, balance)
    const combatant = sessionHook.session.data.combatants.get(actor.id);
    if (!combatant) {
      throw new Error(`Combatant not found for actor ${actor.id}`);
    }

    if (ap !== undefined) {
      combatant.ap = processCombatantAttribute(ap, combatant.ap);
    }
    if (balance !== undefined) {
      combatant.balance = processCombatantAttribute(balance, combatant.balance);
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
          setPosition(actor, energy.position);
        } else if (energy.energy !== undefined) {
          // Set energy directly in Joules
          setEnergy(actor, energy.energy);
        }
      }
    }

    // Process equipment setup (internal - not exposed in public API)
    if (equipment?.weapon) {
      const weaponItem = inventoryApi.addItem(actor, { schema: equipment.weapon });
      equipmentApi.equipWeapon(actor, weaponItem.id as WeaponItemURN);
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
