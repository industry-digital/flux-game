import { Actor, Stat, ActorStats, ShellStat, Gender } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ShellMutation, ShellMutationType, StatMutation, StatMutationOperation } from '~/types/workbench';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';
import { createTestActor } from '~/testing/world-testing';
import { createWorkbenchSessionApi } from './session/session';
import { WorkbenchSessionApi } from './session/session';
import { DEFAULT_WORKBENCH_SESSION } from '~/testing/constants';

export type WorkbenchScenarioDependencies = {
  useWorkbenchSession: typeof createWorkbenchSessionApi;
};

export const DEFAULT_TEST_WORKBENCH_DEPS: WorkbenchScenarioDependencies = {
  useWorkbenchSession: createWorkbenchSessionApi,
};

export type WorkbenchScenarioActorHooks = {
  session: WorkbenchSessionApi;
};

export type WorkbenchScenarioActor = {
  actor: Actor;
  shell: Shell;
  hooks: WorkbenchScenarioActorHooks;
};

export type ActorSingleStatSetup = number | Partial<ActorStats[keyof ActorStats]>;
export type ActorStatsSetup = {
  pow?: ActorSingleStatSetup;
  fin?: ActorSingleStatSetup;
  res?: ActorSingleStatSetup;
};

export type ShellStatsSetup = ActorStatsSetup;

export type WorkbenchScenarioActorInput = {
  name?: string;
  gender?: Gender;
  stats?: ActorStatsSetup;
  shellStats?: ShellStatsSetup;
  pendingMutations?: ShellMutation[];
  location?: PlaceURN;
};

export type WorkbenchScenarioHook = {
  actors: Record<ActorURN, WorkbenchScenarioActor>;
  context: TransformerContext;
};

export type WorkbenchScenarioInput = {
  sessionId?: SessionURN;
  participants: Record<ActorURN, WorkbenchScenarioActorInput>;
  location?: PlaceURN;
};

/**
 * Creates a complete workbench scenario with actors, shells, and workbench sessions.
 * Leverages the fact that createActor automatically creates shells.
 * @deprecated Use createWorldScenario instead
 */
export function useWorkbenchScenario(
  context: TransformerContext,
  input: WorkbenchScenarioInput,
  {
    useWorkbenchSession: useWorkbenchSessionImpl,
  }: WorkbenchScenarioDependencies = DEFAULT_TEST_WORKBENCH_DEPS,
) {
  const {
    sessionId = DEFAULT_WORKBENCH_SESSION,
    participants,
    location,
  } = input;

  const TEST_WORKBENCH_ID: PlaceURN = location ?? 'flux:place:test-workbench';

  const scenario: WorkbenchScenarioHook = {
    actors: {},
    context,
  };

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

  // Create actors, shells, and workbench sessions
  for (const actorId in participants) {
    const participant = participants[actorId as ActorURN];
    const actorName = participant.name || actorId.split(':').pop() || 'Test Actor';
    const actorLocation = participant.location || TEST_WORKBENCH_ID;

    // Create the actor (shell is auto-created by createTestActor)
    const actor = createTestActor({
      id: actorId,
      name: actorName,
      location: actorLocation
    }, (actor: Actor) => {
      // Update actor stats if provided
      const updatedActor = {
        ...actor,
        gender: participant.gender ?? Gender.MALE,
        stats: {
          ...actor.stats,
          [Stat.POW]: processSingleStat(participant.stats?.pow, 10),
          [Stat.FIN]: processSingleStat(participant.stats?.fin, 10),
          [Stat.RES]: processSingleStat(participant.stats?.res, 10),
        },
      };

      // Update the default shell's stats if shellStats are provided
      if (participant.shellStats) {
        const currentShellId = updatedActor.currentShell;
        const currentShell = updatedActor.shells[currentShellId];
        if (currentShell) {
          updatedActor.shells[currentShellId] = {
            ...currentShell,
            stats: {
              [Stat.POW]: processSingleStat(participant.shellStats?.pow, 10),
              [Stat.FIN]: processSingleStat(participant.shellStats?.fin, 10),
              [Stat.RES]: processSingleStat(participant.shellStats?.res, 10),
            },
          };
        }
      }

      return updatedActor;
    });

    // Add actor to world context
    context.world.actors[actorId as ActorURN] = actor;

    // Get the shell from the actor (it was auto-created)
    const shell = actor.shells[actor.currentShell];

    // Create workbench session for this actor
    const sessionHook = useWorkbenchSessionImpl(context, actorId as ActorURN, context.uniqid());

    // Add any pending mutations to the session
    if (participant.pendingMutations) {
      for (const mutation of participant.pendingMutations) {
        sessionHook.session.data.pendingMutations.push(mutation);
      }
    }

    // Store the scenario actor with hooks
    scenario.actors[actorId as ActorURN] = {
      actor,
      shell,
      hooks: {
        session: sessionHook,
      },
    };
  }

  return scenario;
}

/**
 * Helper function to create common stat mutations for testing
 */
export const createStatMutation = (
  stat: ShellStat,
  operation: StatMutationOperation,
  amount: number,
): StatMutation => ({
  type: ShellMutationType.STAT,
  stat,
  operation,
  amount,
});

/**
 * Helper function to create a simple workbench scenario with one actor
 */
export function useSimpleWorkbenchScenario(
  context: TransformerContext,
  actorSetup: WorkbenchScenarioActorInput = {},
  dependencies?: WorkbenchScenarioDependencies,
) {
  const actorId: ActorURN = 'flux:actor:test-actor';

  return useWorkbenchScenario(
    context,
    {
      participants: {
        [actorId]: actorSetup,
      },
    },
    dependencies,
  );
}

/**
 * Helper to create mock transformer context for workbench testing
 */
export function createMockWorkbenchContext(overrides: Partial<TransformerContext> = {}): TransformerContext {
  const TEST_TIMESTAMP = 1234567890000;
  const TEST_UNIQID = 'test-uniqid-12345';

  return {
    // Core test utilities
    uniqid: () => TEST_UNIQID,
    timestamp: () => TEST_TIMESTAMP,
    random: () => Math.random(),
    debug: () => {},
    profile: () => {},

    // Event system (minimal)
    declareError: () => {},
    declareEvent: () => {},
    getDeclaredEvents: () => [],
    getDeclaredEventsByCommand: () => [],

    // World state (empty but structured)
    world: {
      actors: {},
      shells: {},
      sessions: {},
      places: {},
      actorIds: [],
      placeIds: [],
      items: {},
      itemIds: [],
      sessionIds: [],
    },

    // Minimal API mocks (only what workbench needs)
    schemaManager: {} as any,
    mass: {
      computeCombatMass: () => 1000,
    } as any,
    equipmentApi: {
      getEquippedWeaponSchemaOrFail: () => ({
        baseMass: 2000,
        damage: { base: 50 },
        apCost: 10,
      }),
    } as any,

    // Cache objects (empty but present)
    searchCache: new Map(),
    rollDice: () => ({ total: 10, rolls: [10] }),
    distanceCache: new Map(),
    targetCache: new Map(),
    weaponCache: new Map(),

    // Stub APIs (not used by workbench)
    inventoryApi: {} as any,
    capacitorApi: {} as any,
    skillApi: {} as any,
    metrics: {} as any,

    // Apply any overrides
    ...overrides,
  } as TransformerContext;
}
