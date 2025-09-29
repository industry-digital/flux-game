import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { CombatSession, CombatSessionData, Battlefield, Combatant } from '~/types/combat';
import { SessionStatus, SessionStrategy } from '~/types/session';
import { Actor } from '~/types/entity/actor';
import { EntityType } from '~/types/entity/entity';
import { Modifiers, RollResult, RollSpecification, WorldEvent } from '~/types';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { computeInitiativeRolls } from '~/worldkit/combat/initiative';
import { createSessionId } from '~/worldkit/session';
import { CombatantApi, createCombatantApi } from '~/worldkit/combat/combatant';
import { CombatantManager, createCombatantManager } from '~/worldkit/combat/session/combatant-manager';
import { createCombatLifecycle } from '~/worldkit/combat/session/combat-lifecycle';
import { createTurnManager } from '~/worldkit/combat/session/turn-manager';
import { CombatPlanningDependencies } from '~/worldkit/combat/ai/deps';
import { createCombatGameStateApi } from '~/worldkit/combat/session/game-state';

const uniqid = () => uniqidImpl(16, BASE62_CHARSET);

const createDefaultBattlefield = (): Battlefield => ({
  length: 300,
  margin: 100,
  cover: [],
});

export type CreateCombatSessionDependencies = {
  uniqid?: () => string;
  executeRoll?: (spec: RollSpecification, mods: Modifiers, ...args: any[]) => RollResult;
}

export type CombatSessionInput = {
  id?: SessionURN;
  location: PlaceURN;
  combatants: Combatant[],
  battlefield?: CombatSessionData['battlefield'];
  initiative?: CombatSessionData['initiative'];
};

/**
 * Creates a new combat session with the provided combatants and location.
 */
export const createCombatSession = (
  context: TransformerContext,
  input: CombatSessionInput,
): CombatSession => {
  const { uniqid } = context;
  const { world } = context;

  const getActorOrFail = (actorId: ActorURN): Actor => {
    const actor = world.actors[actorId];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }
    return actor;
  };

  const combatants = new Map(input.combatants.map(c => [c.actorId, c]));
  const initiativeRolls = input.initiative ?? computeInitiativeRolls(combatants, getActorOrFail);
  const firstActor = initiativeRolls.keys().next().value! as ActorURN;

  const data: CombatSessionData = {
    location: input.location,
    combatants: new Map(input.combatants.map(c => [c.actorId, c])),
    initiative: initiativeRolls,
    battlefield: input.battlefield ?? createDefaultBattlefield(),
    rounds: {
      current: {
        number: 1,
        turns: {
          completed: [],
          current: {
            number: 1,
            actor: firstActor,
            actions: [],
          },
        },
      },
      completed: [],
    },
  };

  return {
    id: input.id ?? `flux:session:combat:${uniqid()}`,
    type: EntityType.SESSION,
    strategy: SessionStrategy.COMBAT,
    status: SessionStatus.PENDING,
    data,
    log: [],
  };
};

/**
 * Creates a unique combat session ID.
 */
export function createCombatSessionId(key: string = uniqid()): SessionURN {
  return createSessionId(SessionStrategy.COMBAT, key);
}

export const getCombatSession = (
  world: WorldProjection,
  sessionId: SessionURN,
): CombatSession | undefined => {
  return world.sessions[sessionId] as CombatSession | undefined;
};

export type CombatSessionOptions = {
  deps?: CombatPlanningDependencies
};

export type CombatSessionApi = {
  session: CombatSession;
  isNew: boolean;
  addCombatant: CombatantManager['addCombatant'];
  removeCombatant: CombatantManager['removeCombatant'];
  startCombat: () => void;
  advanceTurn: (trace?: string) => WorldEvent[];
  checkVictoryConditions: () => boolean;
  endCombat: (trace?: string) => WorldEvent[];
  getCombatantApi: (actorId: ActorURN) => CombatantApi;
};

/**
 * Hook-style utility for manipulating combat sessions
 */
export const createCombatSessionApi = (
  context: TransformerContext,
  location: PlaceURN,
  sessionId?: SessionURN,
  battlefield?: Battlefield,
  initiative?: Map<ActorURN, RollResult>,
): CombatSessionApi => {
  const { world } = context;

  let isNew = !sessionId;
  sessionId ??= createCombatSessionId();

  let session!: CombatSession;

  if (isNew) {
    session = createCombatSession(context, {
      id: sessionId,
      location: location,
      combatants: [],
      battlefield,
      initiative,
    });
    // Store the new session in the world context so it can be retrieved later
    world.sessions[sessionId] = session;
  } else {
    session = getCombatSession(world, sessionId)!;
  }

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const combatantManager = createCombatantManager(context, session);
  const gameState = createCombatGameStateApi(context, session, location);
  const combatLifecycle = createCombatLifecycle(context, session, sessionId, location, gameState);
  const turnManager = createTurnManager(context, session);

  /**
   * Enhanced turn advancement that handles resource recovery and checks victory conditions
   */
  function advanceTurn(trace?: string): WorldEvent[] {
    // Record session-level turn processing metrics
    context.metrics?.incrementCounter('combat.session_turns_processed');

    const events: WorldEvent[] = [];

    // 1. Handle resource recovery for the current actor (before turn advancement)
    const currentActor = session.data.rounds.current.turns.current.actor;
    events.push(...gameState.handleEndOfTurn(currentActor, trace));

    // 2. Advance the turn using the turn manager
    events.push(...turnManager.advanceTurn(trace));

    // 3. Death events are emitted immediately by combat actions (e.g., strike)
    // No centralized death detection needed to avoid duplicates

    // 4. Check victory conditions after processing deaths
    context.metrics?.incrementCounter('combat.victory_checks_performed');
    if (gameState.checkVictoryConditions()) {
      // Combat should end - terminate the session
      context.metrics?.incrementCounter('combat.sessions_ended_by_victory');
      events.push(...combatLifecycle.endCombat(trace));
    }

    // Record total events generated
    context.metrics?.recordValue('combat.events_per_turn', events.length);

    return events;
  };

  const createCombatantApiDeps = { advanceTurn };
  const combatantApis = new Map<ActorURN, CombatantApi>();

  function getCombatantApi(actorId: ActorURN): CombatantApi {
    const actor = world.actors[actorId];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }
    if (!combatantApis.has(actorId)) {
      combatantApis.set(actorId, createCombatantApi(context, session, actor, createCombatantApiDeps));
    }
    return combatantApis.get(actorId)!;
  }

  return {
    session,
    isNew,
    ...combatantManager,
    ...combatLifecycle,
    ...gameState,
    advanceTurn,
    getCombatantApi,
  };
};
